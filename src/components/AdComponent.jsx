import React, { useEffect } from 'react';

/**
 * AdComponent for Adsterra Ad Integration
 * Places the script and container for the specific ad unit.
 */
const AdComponent = () => {
    useEffect(() => {
        const SCRIPT_ID = 'adsterra-invoke-js';
        if (!document.getElementById(SCRIPT_ID)) {
            const script = document.createElement('script');
            script.id = SCRIPT_ID;
            script.src = 'https://pl29110148.profitablecpmratenetwork.com/3705d905f3bea18853eecd342950b3cb/invoke.js';
            script.async = true;
            script.dataset.cfasync = 'false';
            document.body.appendChild(script);
        }
    }, []);

    return (
        <div className="ad-container-wrapper" style={{ margin: '1.5rem 0', textAlign: 'center' }}>
            <div id="container-3705d905f3bea18853eecd342950b3cb"></div>
        </div>
    );
};

export default AdComponent;
