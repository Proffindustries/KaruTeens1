// Web Crypto API based Encryption Service (E2EE)
// Using ECDH for key exchange and AES-GCM for message encryption

class EncryptionService {
    constructor() {
        this.dbName = 'KaruTeensCrypto';
        this.storeName = 'keys';
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(this.storeName);
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getLocalKeys() {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('main_keypair');
            request.onsuccess = () => resolve(request.result);
        });
    }

    async generateAndStoreKeys() {
        const keyPair = await window.crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveKey', 'deriveBits']
        );

        const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.put({ publicKeyJwk, privateKeyJwk }, 'main_keypair');

        return publicKeyJwk;
    }

    async deriveSharedKey(myPrivateKeyJwk, theirPublicKeyJwk) {
        const privateKey = await window.crypto.subtle.importKey(
            'jwk', myPrivateKeyJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            false, ['deriveKey']
        );
        const publicKey = await window.crypto.subtle.importKey(
            'jwk', theirPublicKeyJwk,
            { name: 'ECDH', namedCurve: 'P-256' },
            true, []
        );

        return window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: publicKey },
            privateKey,
            { name: 'AES-GCM', length: 256 },
            false, ['encrypt', 'decrypt']
        );
    }

    async encrypt(text, sharedKey) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(text);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            sharedKey,
            encoded
        );

        return {
            content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }

    async decrypt(encryptedB64, ivB64, sharedKey) {
        const encrypted = new Uint8Array(atob(encryptedB64).split('').map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            sharedKey,
            encrypted
        );

        return new TextDecoder().decode(decrypted);
    }
}

export const encryptionService = new EncryptionService();
