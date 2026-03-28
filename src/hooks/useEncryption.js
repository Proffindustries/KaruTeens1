import { useState, useEffect, useCallback } from 'react';
import { encryptionService } from '../utils/encryption';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export const useEncryption = () => {
    const [isReady, setIsReady] = useState(false);
    const [keys, setKeys] = useState(null);
    const { showToast } = useToast();

    const initialize = useCallback(async () => {
        try {
            await encryptionService.init();
            let localKeys = await encryptionService.getLocalKeys();

            if (!localKeys) {
                const publicKeyJwk = await encryptionService.generateAndStoreKeys();
                await api.put('/users/update', { public_key: JSON.stringify(publicKeyJwk) });
                localKeys = await encryptionService.getLocalKeys();
            }

            // Update state outside of the effect to avoid cascading renders
            setKeys(localKeys);
            setIsReady(true);
        } catch (err) {
            showToast('Encryption setup failed. Messages may not be secure.', 'error');
            console.error('Encryption init failed:', err);
            // Still update state on error so UI reflects the error state
            setIsReady(false);
        }
    }, [showToast]);

    // Run initialization effect
    useEffect(() => {
        initialize();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps to run once on mount

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
