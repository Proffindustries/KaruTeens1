import { useState, useEffect, useCallback } from 'react';
import { encryptionService } from '../utils/encryption';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export const useEncryption = () => {
    const [isReady, setIsReady] = useState(false);
    const [keys, setKeys] = useState(null);
    const { showToast } = useToast();

    // Run initialization effect
    useEffect(() => {
        let mounted = true;
        const isE2EEEnabled = import.meta.env.VITE_ENABLE_E2EE === 'true';

        if (!isE2EEEnabled) {
            setIsReady(false);
            return;
        }

        const runInit = async () => {
            try {
                await encryptionService.init();
                let localKeys = await encryptionService.getLocalKeys();

                if (!localKeys && encryptionService.db) {
                    const publicKeyJwk = await encryptionService.generateAndStoreKeys();
                    await api.put('/users/update', { public_key: JSON.stringify(publicKeyJwk) });
                    localKeys = await encryptionService.getLocalKeys();
                }

                if (mounted && localKeys) {
                    setKeys(localKeys);
                    setIsReady(true);
                }
            } catch (err) {
                console.error('Encryption init failed:', err);
                if (mounted) {
                    setIsReady(false);
                }
            }
        };
        runInit();
        return () => {
            mounted = false;
        };
    }, []);

    const encryptForRecipient = useCallback(
        async (text, theirPublicKeyJson) => {
            if (!isReady || !keys || !theirPublicKeyJson) return null;
            try {
                const theirPublicKeyJwk = JSON.parse(theirPublicKeyJson);
                const sharedKey = await encryptionService.deriveSharedKey(
                    keys.privateKeyJwk,
                    theirPublicKeyJwk,
                );
                return await encryptionService.encrypt(text, sharedKey);
            } catch (err) {
                console.warn('Encryption failed:', err);
                return null;
            }
        },
        [isReady, keys],
    );

    const decryptFromSender = useCallback(
        async (encryptedContent, iv, theirPublicKeyJson) => {
            if (!isReady || !keys || !theirPublicKeyJson) return null;
            try {
                const theirPublicKeyJwk = JSON.parse(theirPublicKeyJson);
                const sharedKey = await encryptionService.deriveSharedKey(
                    keys.privateKeyJwk,
                    theirPublicKeyJwk,
                );
                return await encryptionService.decrypt(encryptedContent, iv, sharedKey);
            } catch (err) {
                console.warn('Decryption failed:', err);
                return '[Encrypted Message]';
            }
        },
        [isReady, keys],
    );

    return { isReady, encryptForRecipient, decryptFromSender };
};
