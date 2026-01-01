import { useState, useEffect, useCallback } from 'react';
import { encryptionService } from '../utils/encryption';
import api from '../api/client';

export const useEncryption = () => {
    const [isReady, setIsReady] = useState(false);
    const [keys, setKeys] = useState(null);

    const initialize = useCallback(async () => {
        try {
            await encryptionService.init();
            let localKeys = await encryptionService.getLocalKeys();

            if (!localKeys) {
                const publicKeyJwk = await encryptionService.generateAndStoreKeys();
                // Upload public key to profile
                await api.put('/users/update', { public_key: JSON.stringify(publicKeyJwk) });
                localKeys = await encryptionService.getLocalKeys();
            }

            setKeys(localKeys);
            setIsReady(true);
        } catch (err) {
            console.error('Encryption init failed:', err);
        }
    }, []);

    useEffect(() => {
        initialize();
    }, [initialize]);

    const encryptForRecipient = async (text, theirPublicKeyJson) => {
        if (!isReady || !keys || !theirPublicKeyJson) return null;
        try {
            const theirPublicKeyJwk = JSON.parse(theirPublicKeyJson);
            const sharedKey = await encryptionService.deriveSharedKey(keys.privateKeyJwk, theirPublicKeyJwk);
            return await encryptionService.encrypt(text, sharedKey);
        } catch (err) {
            console.error('Encryption failed:', err);
            return null;
        }
    };

    const decryptFromSender = async (encryptedContent, iv, theirPublicKeyJson) => {
        if (!isReady || !keys || !theirPublicKeyJson) return null;
        try {
            const theirPublicKeyJwk = JSON.parse(theirPublicKeyJson);
            const sharedKey = await encryptionService.deriveSharedKey(keys.privateKeyJwk, theirPublicKeyJwk);
            return await encryptionService.decrypt(encryptedContent, iv, sharedKey);
        } catch (err) {
            console.error('Decryption failed:', err);
            return "[Encrypted Message]";
        }
    };

    return { isReady, encryptForRecipient, decryptFromSender };
};
