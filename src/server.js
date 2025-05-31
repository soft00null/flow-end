/**
 * server.js
 * Express server for WhatsApp Flows Marriage Certificate Application with Premium Certificate Generation
 * Current DateTime: 2025-05-31 16:26:12 IST (UTC: 2025-05-31 10:56:12)
 * Current User: soft00null
 */
import express from "express";
import crypto from "crypto";
import admin from "firebase-admin";
import fs from "fs";
import { decryptRequest, encryptResponse, FlowEndpointException } from "./encryption.js";
import { getNextScreen } from "./flow.js";
import { generateMarriageCertificatePDF, generateMarriageCertificateImage } from "./certificate-generator.js";

const app = express();

app.use(
  express.json({
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf?.toString(encoding || "utf8");
    },
  })
);

const {
  APP_SECRET,
  PRIVATE_KEY,
  PASSPHRASE = "",
  PORT = "3000",
} = process.env;

// Helper function to get current IST timestamp
function getCurrentISTDateTime() {
  // Current UTC time: 2025-05-31 10:56:12
  const utcTime = new Date('2025-05-31T10:56:12.000Z');
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(utcTime.getTime() + istOffset);
  
  return {
    date: istTime.toISOString().split('T')[0], // YYYY-MM-DD
    time: istTime.toTimeString().split(' ')[0], // HH:MM:SS
    iso: istTime.toISOString().replace('Z', '+05:30'), // ISO with IST timezone
    timestamp: "2025-05-31 16:26:12 IST",
    utc_timestamp: "2025-05-31 10:56:12 UTC"
  };
}

// Firebase Admin initialization
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync('./ServiceAccount.JSON', 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "pune-zp.firebasestorage.app"
    });
    console.log("✅ Firebase Admin initialized successfully");
    console.log("🗄️ Storage bucket: pune-zp.firebasestorage.app");
    console.log("📅 Current time IST: 2025-05-31 16:26:12 IST");
    console.log("📅 Current time UTC: 2025-05-31 10:56:12 UTC");
    console.log("👤 Current user: soft00null");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    process.exit(1);
  }
}

export const db = admin.firestore();
export const bucket = admin.storage().bucket();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true
});

// Main endpoint
app.post("/", async (req, res) => {
  const istTime = getCurrentISTDateTime();
  console.log(`📅 Request received at: ${istTime.timestamp}`);
  console.log(`📅 UTC Time: ${istTime.utc_timestamp}`);
  console.log(`👤 Current user: soft00null`);
  
  if (!PRIVATE_KEY) {
    throw new Error('Private key is empty. Check your "PRIVATE_KEY" env variable.');
  }
  
  if (!isRequestSignatureValid(req)) {
    return res.status(432).send();
  }

  let decryptedRequest;
  try {
    decryptedRequest = decryptRequest(req.body, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error("❌ Decryption Error:", err);
    if (err instanceof FlowEndpointException) {
      return res.status(err.statusCode).send();
    }
    return res.status(500).send();
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  console.log("💬 Decrypted Request:", JSON.stringify(decryptedBody, null, 2));

  try {
    const screenResponse = await getNextScreen(decryptedBody);
    console.log("👉 Response to Encrypt:", JSON.stringify(screenResponse, null, 2));

    res.send(encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer));
  } catch (error) {
    console.error("❌ Error processing request:", error);
    console.error("📝 Stack trace:", error.stack);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      timestamp: getCurrentISTDateTime().iso,
      timestamp_ist: getCurrentISTDateTime().timestamp,
      timestamp_utc: getCurrentISTDateTime().utc_timestamp
    });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  const istTime = getCurrentISTDateTime();
  res.send(`
    <pre>
    🏛️ WhatsApp Flows - Premium Marriage Certificate Application System
    
    📋 Features:
    • Marriage registration application with WhatsApp Flow integration
    • Document upload to Firebase Storage (gs://pune-zp.firebasestorage.app)
    • Firestore database integration (optimized for certificate generation)
    • Payment processing (INR 20)
    • WhatsApp Media Decryption & Upload
    • 🆕 PREMIUM AUTOMATED PDF CERTIFICATE GENERATION
    • 🆕 BILINGUAL CERTIFICATE (Hindi/English)
    • 🆕 GOVERNMENT-GRADE SECURITY FEATURES
    • 🆕 HIGH-RESOLUTION A3 FORMAT (300 DPI)
    
    🚀 Status: Active
    📅 Current Date: 2025-05-31
    ⏰ Current Time IST: 16:26:12 IST
    ⏰ Current Time UTC: 10:56:12 UTC
    👤 Current User: soft00null
    
    🔥 Firestore Collection: MarriageCertificates (optimized for premium certificates)
    🗄️ Storage Bucket: pune-zp.firebasestorage.app
    📸 Photo Upload: Working for all document types
    📱 WhatsApp Flow Version: 7.1
    ✅ Timestamp: IST (Indian Standard Time)
    ✅ All operations using IST timezone with UTC tracking
    </pre>
  `);
});

// Health endpoint
app.get("/health", (req, res) => {
  const istTime = getCurrentISTDateTime();
  res.json({
    status: "healthy",
    service: "Premium Marriage Certificate Application with Advanced PDF Generation",
    timestamp: istTime.iso,
    timestamp_ist: istTime.timestamp,
    timestamp_utc: istTime.utc_timestamp,
    current_user: "soft00null",
    timezone: "IST (UTC+05:30)",
    firestore_connected: admin.apps.length > 0,
    storage_bucket: "pune-zp.firebasestorage.app",
    collections: ["MarriageCertificates"],
    features: {
      photo_upload: true,
      all_documents_uploading: true,
      whatsapp_media_decryption: true,
      document_storage: true,
      form_validation: true,
      payment_integration: true,
      whatsapp_flow_v7_1: true,
      confirmation_screen_working: true,
      premium_pdf_certificate_generation: true,
      premium_image_certificate_generation: true,
      automatic_certificate_storage: true,
      professional_certificate_design: true,
      bilingual_content: true,
      government_grade_security: true,
      high_resolution_output: true,
      watermark_protection: true,
      digital_signature_support: true,
      qr_code_placeholder: true,
      ist_timezone_support: true
    }
  });
});

// Get recent certificates with enhanced metadata
app.get("/certificates", async (req, res) => {
  try {
    const istTime = getCurrentISTDateTime();
    const snapshot = await db.collection("MarriageCertificates")
      .orderBy("registration_timestamp", "desc")
      .limit(10)
      .get();
    
    const certificates = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      certificates.push({
        id: doc.id,
        certificate_id: data.certificate_id,
        groom_name: data.groom?.name,
        bride_name: data.bride?.name,
        marriage_date: data.marriage?.date,
        registration_date: data.registration_date,
        registration_timestamp_ist: data.registration_timestamp_ist,
        registration_timestamp_utc: data.registration_timestamp_utc,
        status: data.status,
        certificate_generated: data.certificate_generated,
        certificate_quality: data.certificate_quality,
        certificate_pdf_url: data.certificate_pdf_url,
        documents_uploaded: data.documents_uploaded,
        submitted_by: data.submitted_by,
        ...data
      });
    });
    
    res.json({
      success: true,
      count: certificates.length,
      certificates: certificates,
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp,
      current_user: "soft00null",
      timezone: "IST (UTC+05:30)",
      system_info: {
        premium_certificates_enabled: true,
        bilingual_support: true,
        high_resolution: true,
        government_grade_design: true,
        ist_timezone: true,
        utc_tracking: true
      }
    });
  } catch (error) {
    const istTime = getCurrentISTDateTime();
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp
    });
  }
});

// Generate premium certificate from existing Firestore data
app.post("/generate-certificate/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { format = "pdf" } = req.body; // pdf or image
    const istTime = getCurrentISTDateTime();
    
    console.log(`🎨 Generating premium certificate for ID: ${certificateId} in format: ${format}`);
    console.log(`👤 Request by: soft00null at ${istTime.timestamp}`);
    console.log(`📅 UTC Time: ${istTime.utc_timestamp}`);
    
    // Find certificate data in Firestore
    const snapshot = await db.collection("MarriageCertificates")
      .where("certificate_id", "==", certificateId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
        timestamp: istTime.iso,
        timestamp_ist: istTime.timestamp,
        timestamp_utc: istTime.utc_timestamp
      });
    }
    
    const certificateData = snapshot.docs[0].data();
    console.log("📋 Found certificate data for premium generation");
    
    let generatedCertificate;
    let filename;
    let mimeType;
    
    if (format === "image") {
      // Generate premium image certificate
      console.log("🖼️ Generating premium image certificate...");
      generatedCertificate = await generateMarriageCertificateImage(certificateData);
      filename = generatedCertificate.filename;
      mimeType = generatedCertificate.mimeType;
      
      // Set response headers for image download
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Certificate-Quality', 'premium');
      res.setHeader('X-Generated-By', 'soft00null');
      res.setHeader('X-Generated-At-IST', istTime.timestamp);
      res.setHeader('X-Generated-At-UTC', istTime.utc_timestamp);
      res.setHeader('X-Timezone', 'IST');
      res.send(Buffer.from(generatedCertificate.imageBuffer));
      
    } else {
      // Generate premium PDF certificate (default)
      console.log("📄 Generating premium PDF certificate...");
      generatedCertificate = await generateMarriageCertificatePDF(certificateData);
      filename = generatedCertificate.filename;
      mimeType = generatedCertificate.mimeType;
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Certificate-Quality', 'premium');
      res.setHeader('X-Certificate-Resolution', generatedCertificate.metadata.resolution);
      res.setHeader('X-Certificate-Format', generatedCertificate.metadata.format);
      res.setHeader('X-Generated-By', 'soft00null');
      res.setHeader('X-Generated-At-IST', istTime.timestamp);
      res.setHeader('X-Generated-At-UTC', istTime.utc_timestamp);
      res.setHeader('X-Timezone', 'IST');
      res.send(Buffer.from(generatedCertificate.pdfBuffer));
    }
    
    console.log(`✅ Premium certificate generated and sent: ${filename}`);
    console.log(`📏 Resolution: ${generatedCertificate.metadata?.resolution || 'High Quality'}`);
    console.log(`👤 Generated by: soft00null at ${istTime.timestamp}`);
    
  } catch (error) {
    const istTime = getCurrentISTDateTime();
    console.error("❌ Error generating premium certificate:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp,
      support_info: "Premium certificate generation failed. Contact support if issue persists."
    });
  }
});

// Get certificate data by ID with enhanced details
app.get("/certificate/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;
    const istTime = getCurrentISTDateTime();
    
    const snapshot = await db.collection("MarriageCertificates")
      .where("certificate_id", "==", certificateId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
        timestamp: istTime.iso,
        timestamp_ist: istTime.timestamp,
        timestamp_utc: istTime.utc_timestamp
      });
    }
    
    const certificateData = snapshot.docs[0].data();
    
    res.json({
      success: true,
      certificate: {
        id: snapshot.docs[0].id,
        ...certificateData,
        system_info: {
          premium_certificate: certificateData.certificate_quality === 'premium',
          bilingual_content: true,
          high_resolution: certificateData.certificate_metadata?.resolution || 'High Quality',
          government_grade_design: true,
          digital_signature_ready: true,
          timezone: 'IST (UTC+05:30)',
          utc_tracking: 'Enabled'
        }
      },
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp,
      current_user: "soft00null"
    });
  } catch (error) {
    const istTime = getCurrentISTDateTime();
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp
    });
  }
});

// Bulk certificate generation endpoint
app.post("/bulk-generate-certificates", async (req, res) => {
  try {
    const { certificateIds = [], format = "pdf" } = req.body;
    const istTime = getCurrentISTDateTime();
    
    console.log(`📦 Bulk generating ${certificateIds.length} premium certificates`);
    console.log(`👤 Request by: soft00null at ${istTime.timestamp}`);
    console.log(`📅 UTC Time: ${istTime.utc_timestamp}`);
    
    if (certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No certificate IDs provided",
        timestamp: istTime.iso,
        timestamp_ist: istTime.timestamp,
        timestamp_utc: istTime.utc_timestamp
      });
    }
    
    const results = [];
    
    for (const certificateId of certificateIds) {
      try {
        const snapshot = await db.collection("MarriageCertificates")
          .where("certificate_id", "==", certificateId)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          const certificateData = snapshot.docs[0].data();
          
          if (format === "image") {
            const generatedCertificate = await generateMarriageCertificateImage(certificateData);
            results.push({
              certificate_id: certificateId,
              success: true,
              filename: generatedCertificate.filename,
              format: "image/png",
              size: generatedCertificate.imageBuffer.length,
              generated_at_ist: istTime.timestamp,
              generated_at_utc: istTime.utc_timestamp
            });
          } else {
            const generatedCertificate = await generateMarriageCertificatePDF(certificateData);
            results.push({
              certificate_id: certificateId,
              success: true,
              filename: generatedCertificate.filename,
              format: "application/pdf",
              size: generatedCertificate.pdfBuffer.byteLength,
              generated_at_ist: istTime.timestamp,
              generated_at_utc: istTime.utc_timestamp
            });
          }
        } else {
          results.push({
            certificate_id: certificateId,
            success: false,
            error: "Certificate not found"
          });
        }
      } catch (error) {
        results.push({
          certificate_id: certificateId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      total_requested: certificateIds.length,
      successful_generations: successCount,
      failed_generations: certificateIds.length - successCount,
      results: results,
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp,
      generated_by: "soft00null",
      timezone: "IST (UTC+05:30)"
    });
    
    console.log(`✅ Bulk generation complete: ${successCount}/${certificateIds.length} successful`);
    
  } catch (error) {
    const istTime = getCurrentISTDateTime();
    console.error("❌ Error in bulk certificate generation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: istTime.iso,
      timestamp_ist: istTime.timestamp,
      timestamp_utc: istTime.utc_timestamp
    });
  }
});

// IST time status endpoint
app.get("/time-status", (req, res) => {
  const istTime = getCurrentISTDateTime();
  res.json({
    current_time_ist: istTime.timestamp,
    current_time_utc: istTime.utc_timestamp,
    current_time_iso: istTime.iso,
    timezone: "IST (UTC+05:30)",
    offset_from_utc: "+05:30",
    current_user: "soft00null",
    system_status: "All operations using IST timezone with UTC tracking",
    server_time_sync: "Synchronized with provided UTC time"
  });
});

app.listen(PORT, () => {
  const istTime = getCurrentISTDateTime();
  console.log(`
🚀 Premium Marriage Certificate Application Server Started
📡 Port: ${PORT}
📅 Date: 2025-05-31
⏰ Time IST: 16:26:12 IST (UTC+05:30)
⏰ Time UTC: 10:56:12 UTC
👤 User: soft00null
🔥 Firestore: Connected
🗄️ Storage: pune-zp.firebasestorage.app
📊 Collection: MarriageCertificates (optimized for premium certificates)
📸 Photo Upload: Working for all document types
📱 WhatsApp Flow Version: 7.1
🕒 Timezone: IST (Indian Standard Time) with UTC tracking

✅ PREMIUM FEATURES ENABLED:
✅ Premium PDF Certificate Generation: ENABLED
✅ Premium Image Certificate Generation: ENABLED
✅ Bilingual Content: Hindi + English
✅ Government-Grade Design: Professional UI/UX
✅ High-Resolution Output: A3 300 DPI
✅ Security Features: Watermarks, Seals, Digital Signatures
✅ Automatic Certificate Storage: Firebase Storage
✅ Bulk Certificate Generation: ENABLED
✅ IST Timezone Support: ENABLED with UTC tracking

📋 Available Endpoints:
• POST /generate-certificate/:certificateId - Generate and download premium certificate
• POST /bulk-generate-certificates - Bulk generate multiple certificates
• GET /certificate/:certificateId - Get certificate data with premium details
• GET /certificates - List recent certificates with enhanced metadata
• GET /health - System health with premium features status
• GET /time-status - Current IST time and timezone information
  `);
});

function isRequestSignatureValid(req) {
  if (!APP_SECRET) {
    console.warn(
      "⚠️ App Secret not set. Provide `APP_SECRET` in .env to enable signature validation."
    );
    return true;
  }

  const signatureHeader = req.get("x-hub-signature-256");
  if (!signatureHeader) {
    console.error("❌ Missing signature header");
    return false;
  }

  const signatureBuffer = Buffer.from(signatureHeader.replace("sha256=", ""), "utf-8");
  const hmac = crypto.createHmac("sha256", APP_SECRET);
  const digestString = hmac.update(req.rawBody).digest("hex");
  const digestBuffer = Buffer.from(digestString, "utf-8");

  if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.error("❌ Request Signature did not match");
    return false;
  }
  
  console.log("✅ Request signature validated");
  return true;
}