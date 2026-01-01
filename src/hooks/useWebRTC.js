import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.jsx';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export const useWebRTC = (ws, currentUserId) => {
    const [callState, setCallState] = useState('idle'); // idle, calling, ringing, active
    const [callType, setCallType] = useState(null); // 'voice' or 'video'
    const [remoteUser, setRemoteUser] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnection = useRef(null);
    const callTimerRef = useRef(null);
    const { showToast } = useToast();

    // Start call duration timer
    const startCallTimer = useCallback(() => {
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    }, []);

    // Stop call duration timer
    const stopCallTimer = useCallback(() => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
        setCallDuration(0);
    }, []);

    // Initialize peer connection
    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate && ws && remoteUser) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    data: {
                        candidate: event.candidate,
                        to: remoteUser.user_id
                    }
                }));
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setCallState('active');
                startCallTimer();
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
            }
        };

        return pc;
    }, [ws, remoteUser, startCallTimer]);

    // Start a call
    const startCall = useCallback(async (user, type) => {
        try {
            setCallType(type);
            setRemoteUser(user);
            setCallState('calling');

            const constraints = {
                audio: true,
                video: type === 'video'
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);

            const pc = createPeerConnection();
            peerConnection.current = pc;

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (ws) {
                ws.send(JSON.stringify({
                    type: 'call-offer',
                    data: {
                        offer: offer,
                        to: user.user_id,
                        callType: type,
                        from: currentUserId
                    }
                }));
            }
        } catch (error) {
            console.error('Error starting call:', error);
            showToast('Failed to access camera/microphone', 'error');
            endCall();
        }
    }, [ws, currentUserId, createPeerConnection, showToast]);

    // Answer incoming call
    const answerCall = useCallback(async (offer, caller, type) => {
        try {
            setCallType(type);
            setRemoteUser(caller);
            setCallState('active');

            const constraints = {
                audio: true,
                video: type === 'video'
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);

            const pc = createPeerConnection();
            peerConnection.current = pc;

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (ws) {
                ws.send(JSON.stringify({
                    type: 'call-answer',
                    data: {
                        answer: answer,
                        to: caller.user_id
                    }
                }));
            }
        } catch (error) {
            console.error('Error answering call:', error);
            showToast('Failed to answer call', 'error');
            endCall();
        }
    }, [ws, createPeerConnection, showToast]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (answer) => {
        try {
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }, []);

    // Handle ICE candidate
    const handleIceCandidate = useCallback(async (candidate) => {
        try {
            if (peerConnection.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    }, [localStream, isMuted]);

    // Toggle video
    const toggleVideo = useCallback(() => {
        if (localStream && callType === 'video') {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    }, [localStream, callType, isVideoOff]);

    // End call
    const endCall = useCallback(() => {
        // Stop all tracks
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
        }

        // Close peer connection
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        // Reset state
        setLocalStream(null);
        setRemoteStream(null);
        setCallState('idle');
        setCallType(null);
        setRemoteUser(null);
        setIsMuted(false);
        setIsVideoOff(false);
        stopCallTimer();
    }, [localStream, remoteStream, stopCallTimer]);

    // Reject incoming call
    const rejectCall = useCallback(() => {
        setCallState('idle');
        setRemoteUser(null);
        setCallType(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            endCall();
        };
    }, [endCall]);

    return {
        callState,
        callType,
        remoteUser,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        callDuration,
        startCall,
        answerCall,
        handleAnswer,
        handleIceCandidate,
        toggleMute,
        toggleVideo,
        endCall,
        rejectCall,
        setCallState,
        setRemoteUser,
        setCallType
    };
};
