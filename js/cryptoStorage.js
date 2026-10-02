/**
 * js/cryptoStorage.js
 * Módulo Criptográfico de Proteção de Dados em Repouso (Fase 1 e Fase 2)
 * Implementa AES-GCM 256-bit e HMAC-SHA-256 via Web Crypto API nativa do navegador.
 * Protege cenários, rascunhos de votos no localStorage e envelopes .simtse contra adulteração.
 */

const APP_SYSTEM_SALT = 'SIMULA_JA_MS_TSE_2026_SECURITY_SALT';
const INTEGRITY_TAG = 'SIMTSE_ENC_V3';

export class CryptoStorage {
  /**
   * Deriva uma chave AES-GCM 256-bit a partir de uma senha/PIN ou chave do sistema
   */
  static async deriveKey(secretText, saltString = APP_SYSTEM_SALT) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretText),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(saltString),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Criptografa dados em formato AES-GCM com IV único de 12 bytes
   */
  static async encrypt(plainText, secret = APP_SYSTEM_SALT) {
    try {
      const key = await this.deriveKey(secret);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();

      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(plainText)
      );

      // Concatena IV + Ciphertext em Base64URL
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return this.uint8ToBase64Url(combined);
    } catch (e) {
      console.error('[CRYPTO] Falha ao cifrar:', e);
      throw e;
    }
  }

  /**
   * Descriptografa dados AES-GCM verificando a integridade
   */
  static async decrypt(cipherBase64Url, secret = APP_SYSTEM_SALT) {
    try {
      const key = await this.deriveKey(secret);
      const combined = this.base64UrlToUint8(cipherBase64Url);

      if (combined.length < 13) {
        throw new Error('Formato de dados criptografados inválido.');
      }

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (e) {
      console.error('[CRYPTO] Falha na descriptografia / Chave ou integridade inválida:', e);
      throw e;
    }
  }

  /**
   * Gera assinatura digital HMAC-SHA256 para prevenir adulteração de votos e prazos
   */
  static async sign(message, secret = APP_SYSTEM_SALT) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return this.uint8ToBase64Url(new Uint8Array(signature));
  }

  /**
   * Verifica se a assinatura HMAC-SHA256 confere exatamente
   */
  static async verifySignature(message, signatureBase64Url, secret = APP_SYSTEM_SALT) {
    try {
      const expected = await this.sign(message, secret);
      return expected === signatureBase64Url;
    } catch {
      return false;
    }
  }

  // Utilitários de conversão binária segura
  static uint8ToBase64Url(uint8) {
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static base64UrlToUint8(base64Url) {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
