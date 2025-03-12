// src/utils/crypto.js
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.REACT_APP_CRYPTO_SECRET;

export const encrypt = (text) => {
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Erro na criptografia:', error);
    return null;
  }
};

export const decrypt = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    return null;
  }
};