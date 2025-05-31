/**
 * flow.js
 * WhatsApp Flows: Marriage Certificate Application with Premium Certificate Generation
 * Current DateTime: 2025-05-31 19:13:59 IST (UTC: 13:43:59)
 * Current User: soft00null
 */
import { db, bucket } from "./server.js";
import crypto from "crypto";
import https from "https";
import { generateMarriageCertificatePDF, generateMarriageCertificateImage } from "./certificate-generator.js";

// Global data storage for the current session
let sessionData = {};

// Helper functions
function generateApplicationId() {
  return `MC-${Math.floor(Math.random() * 90000) + 10000}-2025`;
}

function getCurrentDateTime() {
  // Current UTC time: 2025-05-31 13:43:59 (CORRECTED)
  const utcTime = new Date('2025-05-31T13:43:59.000Z');
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(utcTime.getTime() + istOffset);
  
  return {
    date: istTime.toISOString().split('T')[0], // YYYY-MM-DD
    time: istTime.toTimeString().split(' ')[0], // HH:MM:SS
    iso: istTime.toISOString().replace('Z', '+05:30'), // ISO with IST timezone
    timestamp: "2025-05-31 19:13:59 IST", // CORRECTED TO IST
    utc_timestamp: "2025-05-31 13:43:59 UTC" // CORRECTED
  };
}

// Real-time IST date/time functions
function getCurrentISTDateTime() {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
  
  return {
    date: istTime.toISOString().split('T')[0],
    time: istTime.toTimeString().split(' ')[0],
    iso: istTime.toISOString().replace('Z', '+05:30'),
    timestamp: `${istTime.toISOString().split('T')[0]} ${istTime.toTimeString().split(' ')[0]} IST`,
    utc_timestamp: `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]} UTC`,
    full_iso: istTime.toISOString().replace('Z', '+05:30')
  };
}

function getTalukaOptions() {
  return [
    { id: "haveli", title: "Haveli" },
    { id: "pune_city", title: "Pune City" },
    { id: "pimpri_chinchwad", title: "Pimpri Chinchwad" },
    { id: "maval", title: "Maval" },
    { id: "mulshi", title: "Mulshi" }
  ];
}

function getVillageOptions() {
  return [
    { id: "wadgaon_sheri", title: "Wadgaon Sheri" },
    { id: "kharadi", title: "Kharadi" },
    { id: "wagholi", title: "Wagholi" },
    { id: "lohegaon", title: "Lohegaon" },
    { id: "mundhwa", title: "Mundhwa" }
  ];
}

function getMarriageTypes() {
  return [
    { id: "hindu", title: "Hindu Marriage" },
    { id: "special_marriage", title: "Special Marriage Act" },
    { id: "court_marriage", title: "Court Marriage" },
    { id: "other", title: "Other" }
  ];
}

// Function to get display title from ID
function getDisplayTitle(id, options) {
  const option = options.find(opt => opt.id === id);
  return option ? option.title : id;
}

// Format date for display
function formatDateForDisplay(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    const ordinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    return `${ordinal(day)} ${month} ${year}`;
  } catch (error) {
    console.warn(`Date formatting error for ${dateStr}:`, error);
    return dateStr;
  }
}

// Download and decrypt media from WhatsApp CDN
async function downloadAndDecryptMedia(mediaObject) {
  try {
    console.log("📥 Processing media object:", JSON.stringify(mediaObject, null, 2));
    
    if (!mediaObject || !mediaObject.cdn_url || !mediaObject.encryption_metadata) {
      console.warn("⚠️ Invalid media object structure");
      return null;
    }

    const { cdn_url, encryption_metadata, file_name } = mediaObject;
    const { encrypted_hash, iv, encryption_key, hmac_key, plaintext_hash } = encryption_metadata;

    console.log(`⬇️ Downloading ${file_name} from CDN:`, cdn_url);
    
    // Download encrypted file from CDN
    const encryptedData = await new Promise((resolve, reject) => {
      https.get(cdn_url, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });

    console.log(`📦 Downloaded ${encryptedData.length} bytes for ${file_name}`);

    // Validate encrypted file hash
    const encryptedFileHash = crypto.createHash('sha256').update(encryptedData).digest('base64');
    if (encryptedFileHash !== encrypted_hash) {
      throw new Error('Encrypted file hash validation failed');
    }

    // Extract HMAC and ciphertext
    const hmac10 = encryptedData.slice(-10);
    const ciphertext = encryptedData.slice(0, -10);

    // Validate HMAC
    const hmacKey = Buffer.from(hmac_key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const hmacData = Buffer.concat([ivBuffer, ciphertext]);
    const calculatedHmac = crypto.createHmac('sha256', hmacKey).update(hmacData).digest();
    const calculatedHmac10 = calculatedHmac.slice(0, 10);

    if (!hmac10.equals(calculatedHmac10)) {
      throw new Error('HMAC validation failed');
    }

    // Decrypt the content
    const encryptionKeyBuffer = Buffer.from(encryption_key, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKeyBuffer, ivBuffer);
    let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // Validate decrypted content hash
    const decryptedHash = crypto.createHash('sha256').update(decrypted).digest('base64');
    if (decryptedHash !== plaintext_hash) {
      throw new Error('Decrypted content hash validation failed');
    }

    console.log(`✅ Media decrypted successfully: ${file_name}`);
    return { buffer: decrypted, fileName: file_name };

  } catch (error) {
    console.error("❌ Failed to decrypt media:", error);
    return null;
  }
}

// Upload decrypted media to Firebase Storage
async function uploadMediaToFirebase(mediaData, docType, applicationId) {
  try {
    if (!mediaData || !mediaData.buffer) {
      console.warn(`⚠️ No media data for ${docType}`);
      return null;
    }

    const { buffer, fileName } = mediaData;
    const currentIST = getCurrentISTDateTime();
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const filePath = `marriage-certificates/${applicationId}/${docType}_${timestamp}.${fileExtension}`;
    const file = bucket.file(filePath);
    
    // Upload to Firebase Storage
    await file.save(buffer, {
      metadata: {
        contentType: `image/${fileExtension}`,
        metadata: {
          applicationId: applicationId,
          documentType: docType,
          originalFileName: fileName,
          uploadedBy: 'soft00null',
          uploadedAt: currentIST.full_iso,
          uploadedAt_IST: currentIST.timestamp
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();
    
    // Return public URL
    const publicUrl = `https://storage.googleapis.com/pune-zp.firebasestorage.app/${filePath}`;
    console.log(`✅ Media uploaded: ${docType} -> ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.error(`❌ Failed to upload media ${docType}:`, error);
    return null;
  }
}

// Upload generated certificate to Firebase Storage
async function uploadCertificateToFirebase(certificateData, applicationId) {
  try {
    const currentIST = getCurrentISTDateTime();
    console.log("📄 Uploading premium certificate to Firebase Storage...");
    console.log(`👤 Upload initiated by: soft00null at ${currentIST.timestamp}`);
    
    const timestamp = Date.now();
    const filePath = `marriage-certificates/${applicationId}/premium_certificate_${timestamp}.pdf`;
    const file = bucket.file(filePath);
    
    // Upload PDF to Firebase Storage with enhanced metadata
    await file.save(Buffer.from(certificateData.pdfBuffer), {
      metadata: {
        contentType: certificateData.mimeType,
        metadata: {
          applicationId: applicationId,
          documentType: 'premium_marriage_certificate',
          originalFileName: certificateData.filename,
          generatedBy: 'soft00null',
          generatedAt: certificateData.metadata.generated_at,
          generatedAt_IST: certificateData.metadata.generated_at_ist,
          resolution: certificateData.metadata.resolution,
          format: certificateData.metadata.format,
          certificate_id: certificateData.metadata.certificate_id,
          quality: 'premium',
          design_version: '2.0'
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();
    
    // Return public URL
    const publicUrl = `https://storage.googleapis.com/pune-zp.firebasestorage.app/${filePath}`;
    console.log(`✅ Premium certificate uploaded: ${publicUrl}`);
    
    return publicUrl;
    
  } catch (error) {
    console.error(`❌ Failed to upload premium certificate:`, error);
    return null;
  }
}

// Process all document uploads
async function processDocumentUploads(allData, applicationId) {
  const documentUrls = {
    groom_document_url: null,
    bride_document_url: null,
    witness_one_document_url: null,
    witness_two_document_url: null
  };

  try {
    console.log("📸 Processing document uploads for application:", applicationId);
    
    // Process groom document
    if (sessionData.groom_document && Array.isArray(sessionData.groom_document) && sessionData.groom_document.length > 0) {
      console.log("📄 Processing groom document...");
      const decryptedMedia = await downloadAndDecryptMedia(sessionData.groom_document[0]);
      if (decryptedMedia) {
        documentUrls.groom_document_url = await uploadMediaToFirebase(
          decryptedMedia,
          "groom_document",
          applicationId
        );
      }
    }

    // Process bride document
    if (sessionData.bride_document && Array.isArray(sessionData.bride_document) && sessionData.bride_document.length > 0) {
      console.log("📄 Processing bride document...");
      const decryptedMedia = await downloadAndDecryptMedia(sessionData.bride_document[0]);
      if (decryptedMedia) {
        documentUrls.bride_document_url = await uploadMediaToFirebase(
          decryptedMedia,
          "bride_document",
          applicationId
        );
      }
    }

    // Process witness documents from current submission
    if (allData.witness_documents && Array.isArray(allData.witness_documents)) {
      if (allData.witness_documents.length > 0) {
        console.log("📄 Processing witness 1 document...");
        const decryptedMedia = await downloadAndDecryptMedia(allData.witness_documents[0]);
        if (decryptedMedia) {
          documentUrls.witness_one_document_url = await uploadMediaToFirebase(
            decryptedMedia,
            "witness_one_document",
            applicationId
          );
        }
      }
      if (allData.witness_documents.length > 1) {
        console.log("📄 Processing witness 2 document...");
        const decryptedMedia = await downloadAndDecryptMedia(allData.witness_documents[1]);
        if (decryptedMedia) {
          documentUrls.witness_two_document_url = await uploadMediaToFirebase(
            decryptedMedia,
            "witness_two_document",
            applicationId
          );
        }
      }
    }

    const uploadedCount = Object.values(documentUrls).filter(url => url !== null).length;
    console.log(`📸 Document upload summary: ${uploadedCount}/4 documents uploaded successfully`);
    
    return documentUrls;

  } catch (error) {
    console.error("❌ Error processing document uploads:", error);
    return documentUrls;
  }
}

export async function getNextScreen(decryptedBody) {
  const { action, screen, data, flow_token } = decryptedBody;

  // Ping/health check
  if (action === "ping") {
    const currentIST = getCurrentISTDateTime();
    return { 
      data: { 
        status: "active", 
        version: "7.0", 
        timestamp: currentIST.timestamp,
        current_time_ist: currentIST.timestamp,
        current_time_utc: currentIST.utc_timestamp
      } 
    };
  }

  // Error acknowledgment
  if (data?.error) {
    console.warn("Flow client error:", data.error);
    return { data: { acknowledged: true } };
  }

  // INIT: Start the flow
  if (action === "INIT") {
    const currentIST = getCurrentISTDateTime();
    console.log("🚀 Initializing Premium Marriage Certificate Application Flow");
    console.log(`📅 Current time: ${currentIST.timestamp}`);
    console.log("👤 Current user: soft00null");
    
    // Reset session data for new flow
    sessionData = {};
    
    return {
      screen: "WELCOME",
      data: {
        taluka_options: getTalukaOptions(),
        village_options: getVillageOptions(),
        marriage_types: getMarriageTypes(),
        current_timestamp: currentIST.timestamp
      }
    };
  }

  // Navigate between screens (only for Welcome screen)
  if (action === "navigate") {
    const currentIST = getCurrentISTDateTime();
    console.log(`🔄 Navigating from ${screen} to next screen`);
    console.log("📝 Data being passed:", JSON.stringify(data, null, 2));
    
    switch (screen) {
      case "WELCOME":
        return {
          screen: "GROOM_DETAILS",
          data: {
            taluka: data?.taluka || "",
            village: data?.village || "",
            marriage_date: data?.marriage_date || "",
            marriage_type: data?.marriage_type || "",
            marriage_location: data?.marriage_location || "",
            timestamp_ist: currentIST.timestamp,
            submitted_by: "soft00null"
          }
        };

      default:
        throw new Error("Unhandled navigate screen: " + screen);
    }
  }

  // DATA_EXCHANGE: Handle form submissions and navigation
  if (action === "data_exchange") {
    const currentIST = getCurrentISTDateTime();
    console.log(`📊 Data exchange on screen: ${screen}`);
    console.log("📝 Received data:", JSON.stringify(data, null, 2));
    
    switch (screen) {
      case "GROOM_DETAILS": {
        if (data?.screen_data === "groom_complete") {
          // Store groom document in session for later processing
          sessionData.groom_document = data.groom_document;
          
          console.log("✅ Stored groom document in session for processing");
          
          return {
            screen: "BRIDE_DETAILS",
            data: {
              // Marriage info (with fallbacks)
              taluka: data?.taluka || "",
              village: data?.village || "",
              marriage_date: data?.marriage_date || "",
              marriage_type: data?.marriage_type || "",
              marriage_location: data?.marriage_location || "",
              timestamp_ist: currentIST.timestamp,
              submitted_by: "soft00null",
              // Groom info
              groom_name: data?.groom_name || "",
              groom_dob: data?.groom_dob || "",
              groom_father_name: data?.groom_father_name || "",
              groom_mobile: data?.groom_mobile || "",
              groom_address: data?.groom_address || ""
            }
          };
        }
        break;
      }

      case "BRIDE_DETAILS": {
        if (data?.screen_data === "bride_complete") {
          // Store bride document in session for later processing
          sessionData.bride_document = data.bride_document;
          
          console.log("✅ Stored bride document in session for processing");
          
          return {
            screen: "WITNESS_DETAILS",
            data: {
              // All previous data to be passed forward (with fallbacks)
              taluka: data?.taluka || "",
              village: data?.village || "",
              marriage_date: data?.marriage_date || "",
              marriage_type: data?.marriage_type || "",
              marriage_location: data?.marriage_location || "",
              timestamp_ist: currentIST.timestamp,
              submitted_by: "soft00null",
              groom_name: data?.groom_name || "",
              groom_dob: data?.groom_dob || "",
              groom_father_name: data?.groom_father_name || "",
              groom_mobile: data?.groom_mobile || "",
              groom_address: data?.groom_address || "",
              bride_name: data?.bride_name || "",
              bride_dob: data?.bride_dob || "",
              bride_father_name: data?.bride_father_name || "",
              bride_mobile: data?.bride_mobile || "",
              bride_address: data?.bride_address || ""
            }
          };
        }
        break;
      }

      case "WITNESS_DETAILS": {
        if (data?.screen_data === "witness_complete") {
          console.log("✅ Processing witness completion and preparing confirmation screen");
          
          // Get all data with safe fallbacks
          const allData = {
            taluka: data?.taluka || "",
            village: data?.village || "",
            marriage_date: data?.marriage_date || "",
            marriage_type: data?.marriage_type || "",
            marriage_location: data?.marriage_location || "",
            groom_name: data?.groom_name || "",
            groom_dob: data?.groom_dob || "",
            groom_father_name: data?.groom_father_name || "",
            groom_mobile: data?.groom_mobile || "",
            groom_address: data?.groom_address || "",
            bride_name: data?.bride_name || "",
            bride_dob: data?.bride_dob || "",
            bride_father_name: data?.bride_father_name || "",
            bride_mobile: data?.bride_mobile || "",
            bride_address: data?.bride_address || "",
            witness_one_name: data?.witness_one_name || "",
            witness_one_mobile: data?.witness_one_mobile || "",
            witness_two_name: data?.witness_two_name || "",
            witness_two_mobile: data?.witness_two_mobile || "",
            witness_documents: data?.witness_documents || [],
            timestamp_ist: currentIST.timestamp,
            submitted_by: "soft00null"
          };
          
          // Get display titles for dropdown values
          const talukaOptions = getTalukaOptions();
          const villageOptions = getVillageOptions();
          const marriageTypes = getMarriageTypes();
          
          // Create display values from the actual received data
          const confirmationDisplayData = {
            taluka_display: getDisplayTitle(allData.taluka, talukaOptions),
            village_display: getDisplayTitle(allData.village, villageOptions),
            marriage_date_display: formatDateForDisplay(allData.marriage_date),
            marriage_type_display: getDisplayTitle(allData.marriage_type, marriageTypes),
            marriage_location_display: allData.marriage_location,
            groom_name_display: allData.groom_name,
            bride_name_display: allData.bride_name,
            witness_one_display: allData.witness_one_name,
            witness_two_display: allData.witness_two_name,
            groom_mobile_display: allData.groom_mobile,
            bride_mobile_display: allData.bride_mobile,
            groom_father_name_display: allData.groom_father_name,
            bride_father_name_display: allData.bride_father_name,
            groom_dob_display: formatDateForDisplay(allData.groom_dob),
            bride_dob_display: formatDateForDisplay(allData.bride_dob),
            documents_uploaded_count: 4,
            timestamp_ist: allData.timestamp_ist,
            submitted_by: allData.submitted_by
          };
          
          console.log("✅ Prepared confirmation display data:", JSON.stringify(confirmationDisplayData, null, 2));
          
          // Store complete data for final submission
          sessionData.completeData = allData;
          console.log("💾 Stored complete data in session for final submission");
          
          return {
            screen: "CONFIRMATION",
            data: confirmationDisplayData
          };
        }
        break;
      }

      default:
        console.error("Unhandled screen in data_exchange:", screen);
        throw new Error("Unhandled screen in data_exchange: " + screen);
    }
  }

  // COMPLETE: Handle final submission (CRITICAL - This was missing!)
  if (action === "complete") {
    const currentIST = getCurrentISTDateTime();
    console.log(`🏁 COMPLETE action received on screen: ${screen}`);
    console.log("📝 Final submission data:", JSON.stringify(data, null, 2));
    
    if (screen === "CONFIRMATION" && data?.screen_data === "final_submission") {
      try {
        console.log("🚀 Processing final application submission with premium certificate generation...");
        console.log("👤 Submitted by: soft00null");
        console.log(`📅 Submission time: ${currentIST.timestamp}`);
        
        const applicationId = generateApplicationId();
        
        console.log("🆔 Generated Application ID:", applicationId);
        
        const allData = sessionData.completeData || {};
        console.log("📝 Complete data for processing:", JSON.stringify(allData, null, 2));
        
        if (!allData.groom_name || !allData.bride_name) {
          throw new Error("Missing required data - groom_name or bride_name not found in session");
        }
        
        // Process document uploads
        console.log("📸 Starting document upload process...");
        const documentUrls = await processDocumentUploads(allData, applicationId);
        
        // Prepare essential data for marriage certificate generation
        const marriageCertificateData = {
          // Certificate identification
          certificate_id: applicationId,
          registration_date: currentIST.date,
          registration_time: currentIST.time,
          registration_timestamp: currentIST.full_iso,
          registration_timestamp_ist: currentIST.timestamp,
          
          // Marriage details for certificate
          marriage: {
            date: allData.marriage_date || "",
            place: allData.marriage_location || "",
            taluka: allData.taluka || "",
            village: allData.village || "",
            type: allData.marriage_type || ""
          },
          
          // Groom details for certificate
          groom: {
            name: allData.groom_name || "",
            father_name: allData.groom_father_name || "",
            date_of_birth: allData.groom_dob || "",
            address: allData.groom_address || "",
            mobile: allData.groom_mobile || "",
            document_url: documentUrls.groom_document_url
          },
          
          // Bride details for certificate
          bride: {
            name: allData.bride_name || "",
            father_name: allData.bride_father_name || "",
            date_of_birth: allData.bride_dob || "",
            address: allData.bride_address || "",
            mobile: allData.bride_mobile || "",
            document_url: documentUrls.bride_document_url
          },
          
          // Witnesses for certificate
          witnesses: {
            witness_1: {
              name: allData.witness_one_name || "",
              mobile: allData.witness_one_mobile || "",
              document_url: documentUrls.witness_one_document_url
            },
            witness_2: {
              name: allData.witness_two_name || "",
              mobile: allData.witness_two_mobile || "",
              document_url: documentUrls.witness_two_document_url
            }
          },
          
          // Application status
          status: "certificate_generated",
          payment_status: "completed",
          processing_status: "completed",
          
          // Administrative details
          submitted_by: "soft00null",
          application_fee: "INR 20",
          agreements: {
            payment_agreed: data?.payment_agreement || false,
            declaration_agreed: data?.declaration_agreement || false
          },
          
          // Document tracking
          documents_uploaded: Object.values(documentUrls).filter(url => url !== null).length,
          
          // Technical metadata
          flow_version: "7.0",
          flow_token: flow_token || "",
          submission_source: "whatsapp_flow",
          
          // IST Timestamps
          created_at_ist: currentIST.timestamp,
          created_at_utc: currentIST.utc_timestamp,
          timezone: "IST"
        };

        console.log("📝 Marriage certificate data prepared:", JSON.stringify(marriageCertificateData, null, 2));

        // Generate premium marriage certificate PDF
        console.log("🎨 Generating premium marriage certificate PDF...");
        const certificatePDF = await generateMarriageCertificatePDF(marriageCertificateData);
        
        // Upload certificate to Firebase Storage
        console.log("☁️ Uploading certificate to Firebase Storage...");
        const certificateUrl = await uploadCertificateToFirebase(certificatePDF, applicationId);
        
        // Add certificate URL and metadata to data
        marriageCertificateData.certificate_pdf_url = certificateUrl;
        marriageCertificateData.certificate_generated = true;
        marriageCertificateData.certificate_generated_at = currentIST.full_iso;
        marriageCertificateData.certificate_generated_at_ist = currentIST.timestamp;
        marriageCertificateData.certificate_metadata = certificatePDF.metadata;
        marriageCertificateData.certificate_quality = "premium";
        marriageCertificateData.certificate_design_version = "2.0";

        // Store in Firestore with enhanced data structure
        console.log("💾 Saving marriage certificate data to Firestore collection: MarriageCertificates");
        console.log("📝 Final data to store:", JSON.stringify(marriageCertificateData, null, 2));
        
        const docRef = await db.collection("MarriageCertificates").add(marriageCertificateData);
        
        console.log(`✅ Marriage Certificate Application stored successfully!`);
        console.log(`📄 Firestore Document ID: ${docRef.id}`);
        console.log(`🆔 Certificate ID: ${applicationId}`);
        console.log(`📅 Registration: ${currentIST.date} ${currentIST.time} IST`);
        console.log(`👤 Submitted by: soft00null`);
        console.log(`📸 Documents uploaded: ${marriageCertificateData.documents_uploaded}/4`);
        console.log(`📋 Certificate URL: ${certificateUrl}`);

        // Store names for response before clearing session data
        const groomName = allData.groom_name || "Not available";
        const brideName = allData.bride_name || "Not available";

        // Clear session data
        sessionData = {};

        // Return success response for complete action (v7.0 format)
        return {
          data: {
            success: true,
            certificate_id: applicationId,
            document_id: docRef.id,
            certificate_pdf_url: certificateUrl,
            confirmation_message: `🎉 Your premium marriage certificate has been generated successfully!\n\n📋 Certificate ID: ${applicationId}\n📄 Premium PDF Certificate: Generated\n📸 Documents uploaded: ${marriageCertificateData.documents_uploaded}/4\n\n✅ You will receive an SMS confirmation shortly.`,
            processing_info: "Your premium marriage certificate has been generated and is ready for download. The certificate features bilingual content (Hindi/English) with government-grade security features.",
            submission_details: {
              submission_time_ist: currentIST.timestamp,
              submission_time_utc: currentIST.utc_timestamp,
              groom_name: groomName,
              bride_name: brideName,
              documents_uploaded: marriageCertificateData.documents_uploaded,
              application_fee: "INR 20",
              certificate_generated: true,
              certificate_quality: "premium"
            },
            // Extension message response for WhatsApp (v7.0 format)
            extension_message_response: {
              params: {
                flow_token: flow_token,
                certificate_id: applicationId,
                groom_name: groomName,
                bride_name: brideName,
                registration_date: currentIST.date,
                registration_time: currentIST.time,
                registration_time_ist: currentIST.timestamp,
                status: "premium_certificate_generated",
                certificate_url: certificateUrl,
                certificate_quality: "premium"
              }
            }
          }
        };

      } catch (error) {
        console.error("❌ Failed to store marriage certificate application:", error);
        console.error("📝 Error details:", {
          message: error.message,
          stack: error.stack,
          sessionData: JSON.stringify(sessionData, null, 2)
        });
        
        return {
          data: {
            success: false,
            error_message: "Failed to submit application and generate premium certificate. Please try again later.",
            certificate_id: null,
            error_details: error.message,
            timestamp: getCurrentISTDateTime().full_iso,
            timestamp_ist: getCurrentISTDateTime().timestamp,
            support_info: "If the problem persists, please contact support with error code: MC_PREMIUM_FAIL_20250531"
          }
        };
      }
    }
  }

  console.error("Unhandled request:", decryptedBody);
  throw new Error("Unhandled endpoint request");
}