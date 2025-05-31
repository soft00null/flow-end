/**
 * encryption.js
 *
 * Provides helper methods to:
 *  - decrypt the incoming request (AES key + Flow data)
 *  - encrypt the response
 *  - handle flow exceptions
 */
import crypto from "crypto";

export const decryptRequest = (body, privatePem, passphrase) => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new FlowEndpointException(400, "Missing encrypted request fields");
  }

  const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
  let decryptedAesKey;
  try {
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encrypted_aes_key, "base64")
    );
  } catch (error) {
    console.error(error);
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key."
    );
  }

  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const TAG_LENGTH = 16;
  const encryptedBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const authTag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-128-gcm", decryptedAesKey, initialVectorBuffer);
  decipher.setAuthTag(authTag);

  const decryptedJSON = Buffer.concat([
    decipher.update(encryptedBody),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSON),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
};

export const encryptResponse = (response, aesKeyBuffer, initialVectorBuffer) => {
  // Flip the IV to produce a new IV
  const flipped_iv = [];
  for (const [, byte] of initialVectorBuffer.entries()) {
    flipped_iv.push(~byte);
  }

  // Encrypt the response data
  const cipher = crypto.createCipheriv("aes-128-gcm", aesKeyBuffer, Buffer.from(flipped_iv));
  const encryptedBuffer = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([encryptedBuffer, authTag]).toString("base64");
};

export class FlowEndpointException extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}