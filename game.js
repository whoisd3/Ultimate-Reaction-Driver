// Ultimate Reaction Driver - Main Game Engine
// Author: Advanced Endless Driving Game
// Features: Three.js, WebRTC Multiplayer, WebXR, PWA, Leveling System

class GameEngine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.obstacles = [];
        this.particles = [];
        this.powerUps = [];
        this.activePowerUps = new Map();
        this.gameState = 'loading';
        this.currentMode = 'classic';
        this.weatherSystem = null;
        this.currentWeather = 'clear';
        this.score = 0;
        this.distance = 0;
        this.speed = 0;
        this.baseSpeed = 50;
        this.maxSpeed = 200;
        this.obstacleSpawnTimer = 0;
        this.timeElapsed = 0;
        this.roadSegments = [];
        this.audioContext = null;
        this.sounds = {};
        this.musicNode = null;
        
        // Notification queue system
        this.notificationQueue = [];
        this.currentNotification = null;
        this.lastNotificationTime = 0;
        
        // Performance monitoring
        this.performanceMonitor = {
            frameCount: 0,
            lastTime: 0,
            fps: 60,
            adaptiveQuality: true
        };
        
        // WebRTC Multiplayer
        this.peer = null;
        this.connections = [];
        this.isHost = false;
        this.roomId = null;
        this.remotePlayers = {};
        
        // WebXR
        this.xrSession = null;
        this.isVRActive = false;
        
        // Input
        this.keys = {};
        this.touchStartX = 0;
        this.playerLane = 0; // -1, 0, 1 for left, center, right
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Ultimate Reaction Driver...');
            
            // Check for Three.js
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js library not loaded');
            }
            console.log('Three.js loaded successfully');
            
            this.setupRenderer();
            this.setupScene();
            this.setupCamera();
            this.setupLights();
            this.setupAudio();
            this.createRoad();
            this.createPlayer();
            this.setupInput();
            this.setupWebXR();
            
            // Load player progress
            await playerProgress.load();
            this.updateUI();
            
            // Simulate loading
            await this.simulateLoading();
            
            this.hideLoading();
            this.showMainMenu();
            
            console.log('Game initialized successfully!');
            
            // Create speed lines effect
            this.createSpeedLines();
            
            // Start render loop
            this.animate();
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showError('Game failed to initialize: ' + error.message);
        }
    }

    setupRenderer() {
        try {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) {
                throw new Error('Game canvas not found');
            }
            
            // Detect mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: !isMobile, // Disable antialiasing on mobile for performance
                alpha: true,
                powerPreference: isMobile ? 'low-power' : 'high-performance'
            });
            
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Optimize pixel ratio for mobile
            const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 2);
            this.renderer.setPixelRatio(pixelRatio);
            
            this.renderer.shadowMap.enabled = !isMobile; // Disable shadows on mobile
            if (!isMobile) {
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            }
            
            this.renderer.xr.enabled = true;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.25;
            
            // Store mobile flag for other optimizations
            this.isMobile = isMobile;
            
            console.log(`Renderer setup complete (Mobile: ${isMobile})`);
        } catch (error) {
            console.error('Renderer setup failed:', error);
            throw error;
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1a);
        this.scene.fog = new THREE.Fog(0x0a0a1a, 50, 300);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 15, 30);
        this.camera.lookAt(0, 0, 0);
    }

    setupLights() {
        // Directional light (sun/moon)
        const directionalLight = new THREE.DirectionalLight(0x8888ff, 1.2);
        directionalLight.position.set(50, 100, 50);
        
        // Only enable shadows on desktop
        if (!this.isMobile) {
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 200;
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
        }
        
        this.scene.add(directionalLight);

        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x202040, 0.3);
        this.scene.add(ambientLight);

        // Reduce atmospheric lights on mobile
        const lightCount = this.isMobile ? 2 : 4;
        const colors = [
            { color: 0x00d4ff, intensity: 3 },
            { color: 0xff006e, intensity: 3 },
            { color: 0x88ff00, intensity: 2 },
            { color: 0xff8800, intensity: 2 }
        ];
        
        colors.slice(0, lightCount).forEach((lightData, index) => {
            const pointLight = new THREE.PointLight(lightData.color, lightData.intensity, 80);
            const angle = (index / lightCount) * Math.PI * 2;
            pointLight.position.set(
                Math.cos(angle) * 40,
                20,
                Math.sin(angle) * 40
            );
            this.scene.add(pointLight);
        });
        
        // Create a simple skybox effect
        const skyGeometry = new THREE.SphereGeometry(400, this.isMobile ? 16 : 32, this.isMobile ? 16 : 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x001122,
            side: THREE.BackSide,
            fog: false
        });
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        
        // Add stars (fewer on mobile)
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starColors = [];
        const starCount = this.isMobile ? 500 : 1000;
        
        for (let i = 0; i < starCount; i++) {
            const radius = 350;
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = Math.abs(radius * Math.cos(phi)); // Only upper hemisphere
            const z = radius * Math.sin(phi) * Math.sin(theta);
            
            starPositions.push(x, y, z);
            
            const intensity = Math.random() * 0.8 + 0.2;
            starColors.push(intensity, intensity, intensity);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            fog: false
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
        
        console.log('Enhanced lighting system initialized');
    }

    setupAudio() {
        try {
            // Check if Web Audio is supported
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('Web Audio API not supported');
                return;
            }
            
            this.audioContext = new AudioContext();
            
            // Create oscillators for simple sound effects
            this.createSimpleSounds();
            
            // Background music with Web Audio API
            this.createBackgroundMusic();
            
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Web Audio API setup failed:', e);
        }
    }

    createSimpleSounds() {
        // Engine sound (will be modulated based on speed)
        this.sounds.engine = {
            oscillator: null,
            gainNode: null,
            playing: false
        };

        // Enhanced crash sound with multiple frequencies
        this.sounds.crash = () => {
            if (!this.audioContext) return;
            
            // Create multiple oscillators for a complex crash sound
            const frequencies = [100, 150, 80, 200];
            frequencies.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                osc.type = index % 2 === 0 ? 'sawtooth' : 'square';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.3, this.audioContext.currentTime + 0.8);
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
                filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.8);
                
                gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.8);
            });
            
            // Add noise burst
            const noiseBuffer = this.createNoiseBuffer(0.3);
            const noiseSource = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            
            noiseSource.buffer = noiseBuffer;
            noiseGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            noiseSource.connect(noiseGain);
            noiseGain.connect(this.audioContext.destination);
            noiseSource.start();
        };

        // Enhanced pickup sound with harmonic series
        this.sounds.pickup = () => {
            if (!this.audioContext) return;
            
            const baseFreq = 440;
            const harmonics = [1, 2, 3, 4];
            
            harmonics.forEach((harmonic, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq * harmonic, this.audioContext.currentTime);
                
                const volume = 0.1 / harmonic; // Decreasing volume for higher harmonics
                gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.3);
            });
        };
        
        // Whoosh sound for lane changes
        this.sounds.whoosh = () => {
            if (!this.audioContext) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.2);
            
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(100, this.audioContext.currentTime);
            
            gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.2);
        };
        
        // Power-up collection sound
        this.sounds.powerUp = () => {
            if (!this.audioContext) return;
            
            const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5 (A major chord)
            
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    
                    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.4);
                    
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.start();
                    osc.stop(this.audioContext.currentTime + 0.4);
                }, index * 50);
            });
        };
    }
    
    createNoiseBuffer(duration) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        return buffer;
    }

    createBackgroundMusic() {
        if (!this.audioContext) return;
        
        // Create ambient/atmospheric soundscape instead of melodic music
        this.musicLoop = () => {
            if (this.gameState !== 'playing') {
                setTimeout(() => this.musicLoop(), 100);
                return;
            }
            
            const startTime = this.audioContext.currentTime;
            
            // Create ambient drone sounds
            this.createAmbientDrone(110, 8, startTime); // Low drone
            this.createAmbientDrone(165, 6, startTime + 1); // Mid drone
            this.createAmbientDrone(220, 4, startTime + 2); // Higher drone
            
            // Add subtle noise sweeps
            this.createNoiseSweep(startTime + 0.5);
            this.createNoiseSweep(startTime + 4);
            
            setTimeout(() => this.musicLoop(), 8000); // 8 second loop
        };
    }
    
    createAmbientDrone(frequency, duration, startTime) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.value = frequency;
        
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 2;
        filter.Q.value = 2;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.015, startTime + 1);
        gain.gain.setValueAtTime(0.015, startTime + duration - 1);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    }
    
    createNoiseSweep(startTime) {
        const noiseBuffer = this.createNoiseBuffer(2);
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        source.buffer = noiseBuffer;
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, startTime);
        filter.frequency.exponentialRampToValueAtTime(1200, startTime + 2);
        filter.Q.value = 8;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.008, startTime + 0.3);
        gain.gain.linearRampToValueAtTime(0, startTime + 2);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        source.start(startTime);
    }

    startEngineSound() {
        if (!this.audioContext || this.sounds.engine.playing) return;
        
        // Resume audio context if suspended (required by modern browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.value = 80;
            gain.gain.value = 0.1;
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start();
            
            this.sounds.engine.oscillator = osc;
            this.sounds.engine.gainNode = gain;
            this.sounds.engine.playing = true;
        } catch (error) {
            console.warn('Failed to start engine sound:', error);
        }
    }

    stopEngineSound() {
        if (!this.sounds.engine.playing) return;
        
        if (this.sounds.engine.oscillator) {
            this.sounds.engine.oscillator.stop();
            this.sounds.engine.oscillator = null;
        }
        this.sounds.engine.playing = false;
    }

    updateEngineSound() {
        if (!this.sounds.engine.playing || !this.sounds.engine.oscillator) return;
        
        const speedRatio = this.speed / this.maxSpeed;
        const frequency = 80 + (speedRatio * 150);
        this.sounds.engine.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    }

    createRoad() {
        const roadWidth = 30;
        const roadLength = 500;
        const segmentLength = 50;
        const numSegments = Math.ceil(roadLength / segmentLength) + 2;

        // Create road texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Dark asphalt base
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 512, 512);
        
        // Add some texture noise
        for (let i = 0; i < 1000; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 50 + 20}, ${Math.random() * 50 + 20}, ${Math.random() * 50 + 20}, 0.3)`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        
        const roadTexture = new THREE.CanvasTexture(canvas);
        roadTexture.wrapS = THREE.RepeatWrapping;
        roadTexture.wrapT = THREE.RepeatWrapping;
        roadTexture.repeat.set(1, 10);

        for (let i = 0; i < numSegments; i++) {
            const geometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
            const material = new THREE.MeshStandardMaterial({
                map: roadTexture,
                roughness: 0.9,
                metalness: 0.1
            });
            const segment = new THREE.Mesh(geometry, material);
            segment.rotation.x = -Math.PI / 2;
            segment.position.z = -i * segmentLength;
            segment.receiveShadow = true;
            this.scene.add(segment);
            this.roadSegments.push(segment);

            // Improved road markings
            const markingGeometry = new THREE.PlaneGeometry(1, 5);
            const markingMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
            });
            
            for (let j = 0; j < 5; j++) {
                const marking = new THREE.Mesh(markingGeometry, markingMaterial);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(0, 0.1, -i * segmentLength - j * 10);
                segment.add(marking);
            }
            
            // Add lane dividers
            const dividerGeometry = new THREE.PlaneGeometry(0.5, 3);
            const dividerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.6
            });
            
            [-10, 10].forEach(x => {
                for (let j = 0; j < 10; j++) {
                    const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
                    divider.rotation.x = -Math.PI / 2;
                    divider.position.set(x, 0.1, -i * segmentLength - j * 5);
                    segment.add(divider);
                }
            });
        }

        // Enhanced side barriers with lighting
        const barrierGeometry = new THREE.BoxGeometry(2, 3, 500);
        const barrierMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3366,
            emissive: 0x330011,
            emissiveIntensity: 0.1,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        leftBarrier.position.set(-roadWidth / 2 - 1, 1.5, -250);
        leftBarrier.castShadow = true;
        this.scene.add(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        rightBarrier.position.set(roadWidth / 2 + 1, 1.5, -250);
        rightBarrier.castShadow = true;
        this.scene.add(rightBarrier);
        
        // Add side lights
        for (let i = 0; i < 10; i++) {
            const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 0.5
            });
            
            const leftLight = new THREE.Mesh(lightGeometry, lightMaterial);
            leftLight.position.set(-roadWidth / 2 - 3, 3, -i * 50);
            this.scene.add(leftLight);
            
            const rightLight = new THREE.Mesh(lightGeometry, lightMaterial);
            rightLight.position.set(roadWidth / 2 + 3, 3, -i * 50);
            this.scene.add(rightLight);
            
            // Add point lights for actual illumination
            const pointLight1 = new THREE.PointLight(0x00ffff, 0.5, 30);
            pointLight1.position.copy(leftLight.position);
            this.scene.add(pointLight1);
            
            const pointLight2 = new THREE.PointLight(0x00ffff, 0.5, 30);
            pointLight2.position.copy(rightLight.position);
            this.scene.add(pointLight2);
        }
    }

    createPlayer() {
        const vehicleData = playerProgress.getCurrentVehicle();
        
        // Create vehicle body with metallic material
        const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: vehicleData.color || 0x00d4ff,
            metalness: 0.9,
            roughness: 0.1,
            emissive: new THREE.Color(vehicleData.color || 0x00d4ff).multiplyScalar(0.05),
            envMapIntensity: 1.0
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        
        // Create vehicle top with glass material
        const topGeometry = new THREE.BoxGeometry(2.5, 0.8, 3);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0x2222ff,
            metalness: 0.1,
            roughness: 0.1,
            opacity: 0.8,
            transparent: true,
            envMapIntensity: 2.0
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 1.15;
        top.castShadow = true;
        
        // Create enhanced wheels with rim details
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.3
        });
        
        const rimGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.31, 8);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 1.0,
            roughness: 0.1
        });
        
        const wheels = [];
        const wheelPositions = [
            [-1.2, -0.5, 1.5],
            [1.2, -0.5, 1.5],
            [-1.2, -0.5, -1.5],
            [1.2, -0.5, -1.5]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            
            wheel.rotation.z = Math.PI / 2;
            rim.rotation.z = Math.PI / 2;
            
            wheel.position.set(...pos);
            rim.position.set(...pos);
            
            wheel.castShadow = true;
            rim.castShadow = true;
            
            wheels.push(wheel);
            wheels.push(rim); // Add rims to wheels array for rotation
        });
        
        // Add headlights
        const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const headlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-1, 0.5, 2.6);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(1, 0.5, 2.6);
        
        // Add headlight illumination
        const headlightSpot1 = new THREE.SpotLight(0xffffff, 2, 50, Math.PI / 6, 0.1);
        headlightSpot1.position.copy(leftHeadlight.position);
        headlightSpot1.target.position.set(-1, 0, -10);
        headlightSpot1.castShadow = true;
        
        const headlightSpot2 = new THREE.SpotLight(0xffffff, 2, 50, Math.PI / 6, 0.1);
        headlightSpot2.position.copy(rightHeadlight.position);
        headlightSpot2.target.position.set(1, 0, -10);
        headlightSpot2.castShadow = true;
        
        // Create targets as objects that will be added to the player group
        const leftTarget = new THREE.Object3D();
        leftTarget.position.set(-1, 0, -10);
        const rightTarget = new THREE.Object3D();
        rightTarget.position.set(1, 0, -10);
        
        // Add taillights
        const taillightMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        });
        
        const leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        leftTaillight.position.set(-1, 0.5, -2.6);
        
        const rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
        rightTaillight.position.set(1, 0.5, -2.6);
        
        // Create player group
        this.player = new THREE.Group();
        this.player.add(body);
        this.player.add(top);
        this.player.add(leftHeadlight);
        this.player.add(rightHeadlight);
        this.player.add(leftTaillight);
        this.player.add(rightTaillight);
        this.player.add(headlightSpot1);
        this.player.add(headlightSpot2);
        this.player.add(leftTarget);
        this.player.add(rightTarget);
        
        wheels.forEach(wheel => this.player.add(wheel));
        
        // Set the spotlight targets to the target objects
        headlightSpot1.target = leftTarget;
        headlightSpot2.target = rightTarget;
        
        this.player.position.set(0, 1, 20);
        this.player.userData.wheels = wheels;
        this.player.userData.headlights = [headlightSpot1, headlightSpot2];
        this.scene.add(this.player);
    }

    createObstacle() {
        const types = ['box', 'cone', 'barrier', 'car', 'truck'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let geometry, material, obstacle;
        
        switch(type) {
            case 'box':
                geometry = new THREE.BoxGeometry(3, 3, 3);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xff6600,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0x221100,
                    emissiveIntensity: 0.1
                });
                obstacle = new THREE.Mesh(geometry, material);
                break;
                
            case 'cone':
                geometry = new THREE.ConeGeometry(1.5, 4, 8);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xff3300,
                    roughness: 0.9,
                    metalness: 0.1
                });
                obstacle = new THREE.Mesh(geometry, material);
                
                // Add reflective stripe
                const stripeGeometry = new THREE.RingGeometry(1.2, 1.5, 8);
                const stripeMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xffffff,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.2
                });
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.y = 1.5;
                obstacle.add(stripe);
                break;
                
            case 'barrier':
                geometry = new THREE.BoxGeometry(8, 2, 1);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xff0000,
                    metalness: 0.7,
                    roughness: 0.3,
                    emissive: 0x330000,
                    emissiveIntensity: 0.2
                });
                obstacle = new THREE.Mesh(geometry, material);
                
                // Add warning lights
                for (let i = -3; i <= 3; i += 2) {
                    const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
                    const lightMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffff00,
                        emissive: 0xffff00,
                        emissiveIntensity: 0.8
                    });
                    const light = new THREE.Mesh(lightGeometry, lightMaterial);
                    light.position.set(i, 1.2, 0);
                    obstacle.add(light);
                }
                break;
                
            case 'car':
                // Create a simple car obstacle
                const carBody = new THREE.BoxGeometry(2.5, 1.2, 4);
                const carMaterial = new THREE.MeshStandardMaterial({
                    color: [0x0088ff, 0x00ff88, 0x8800ff, 0xff8800][Math.floor(Math.random() * 4)],
                    metalness: 0.8,
                    roughness: 0.2
                });
                obstacle = new THREE.Mesh(carBody, carMaterial);
                
                // Add wheels to car
                const carWheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 12);
                const carWheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
                
                const carWheelPositions = [
                    [-1.3, -0.6, 1.2], [1.3, -0.6, 1.2],
                    [-1.3, -0.6, -1.2], [1.3, -0.6, -1.2]
                ];
                
                carWheelPositions.forEach(pos => {
                    const wheel = new THREE.Mesh(carWheelGeometry, carWheelMaterial);
                    wheel.rotation.z = Math.PI / 2;
                    wheel.position.set(...pos);
                    obstacle.add(wheel);
                });
                break;
                
            case 'truck':
                // Create a truck obstacle
                const truckBody = new THREE.BoxGeometry(3, 2.5, 6);
                const truckMaterial = new THREE.MeshStandardMaterial({
                    color: 0x444444,
                    metalness: 0.6,
                    roughness: 0.4
                });
                obstacle = new THREE.Mesh(truckBody, truckMaterial);
                
                // Add truck cab
                const cabGeometry = new THREE.BoxGeometry(3, 2, 2);
                const cab = new THREE.Mesh(cabGeometry, truckMaterial);
                cab.position.z = 2.5;
                cab.position.y = 0.5;
                obstacle.add(cab);
                break;
        }
        
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        
        const lanes = [-10, 0, 10];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        
        let yPos = 1.5;
        if (type === 'cone') yPos = 2;
        else if (type === 'car') yPos = 0.6;
        else if (type === 'truck') yPos = 1.25;
        
        obstacle.position.set(lane, yPos, -100);
        
        // Add some random rotation for variety
        if (type !== 'barrier') {
            obstacle.rotation.y = (Math.random() - 0.5) * 0.2;
        }
        
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }

    createPowerUp() {
        const types = [
            { name: 'speed', color: 0x00ff00, effect: 'Increases speed for 5 seconds' },
            { name: 'shield', color: 0x0088ff, effect: 'Temporary invincibility for 3 seconds' },
            { name: 'score', color: 0xffff00, effect: 'Instant score bonus' },
            { name: 'slowmo', color: 0xff00ff, effect: 'Slows down time for 4 seconds' },
            { name: 'magnet', color: 0xff8800, effect: 'Attracts nearby power-ups for 6 seconds' }
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Create power-up geometry - rotating crystal shape
        const geometry = new THREE.OctahedronGeometry(1, 0);
        const material = new THREE.MeshStandardMaterial({
            color: type.color,
            emissive: type.color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8,
            metalness: 0.8,
            roughness: 0.1
        });
        
        const powerUp = new THREE.Mesh(geometry, material);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: type.color,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        powerUp.add(glow);
        
        // Add floating animation
        powerUp.userData.originalY = 3;
        powerUp.userData.bobOffset = Math.random() * Math.PI * 2;
        powerUp.userData.type = type.name;
        powerUp.userData.rotationSpeed = (Math.random() + 0.5) * 2;
        
        const lanes = [-10, 0, 10];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        powerUp.position.set(lane, 3, -120);
        
        this.scene.add(powerUp);
        this.powerUps.push(powerUp);
    }

    collectPowerUp(powerUp) {
        const type = powerUp.userData.type;
        const duration = {
            speed: 5000,
            shield: 3000,
            score: 0,
            slowmo: 4000,
            magnet: 6000
        }[type];
        
        switch(type) {
            case 'speed':
                this.activePowerUps.set('speed', Date.now() + duration);
                this.showPowerUpNotification('Speed Boost!', 0x00ff00);
                this.showSubtlePowerUpFeedback('SPEED', 0x00ff00);
                break;
                
            case 'shield':
                this.activePowerUps.set('shield', Date.now() + duration);
                this.showPowerUpNotification('Shield Active!', 0x0088ff);
                this.showSubtlePowerUpFeedback('SHIELD', 0x0088ff);
                // Add shield visual effect
                this.createShieldEffect();
                break;
                
            case 'score':
                this.score += 500;
                this.showPowerUpNotification('+500 Points!', 0xffff00);
                this.showSubtlePowerUpFeedback('+500', 0xffff00);
                break;
                
            case 'slowmo':
                this.activePowerUps.set('slowmo', Date.now() + duration);
                this.showPowerUpNotification('Slow Motion!', 0xff00ff);
                this.showSubtlePowerUpFeedback('SLOW-MO', 0xff00ff);
                break;
                
            case 'magnet':
                this.activePowerUps.set('magnet', Date.now() + duration);
                this.showPowerUpNotification('Magnet Active!', 0xff8800);
                this.showSubtlePowerUpFeedback('MAGNET', 0xff8800);
                break;
        }
        
        // Play collection sound
        this.sounds.powerUp();
        
        // Create collection effect
        this.createParticles(powerUp.position, powerUp.material.color.getHex(), 'spark');
        
        // Remove power-up
        this.scene.remove(powerUp);
        const index = this.powerUps.indexOf(powerUp);
        if (index > -1) {
            this.powerUps.splice(index, 1);
        }
    }

    createShieldEffect() {
        if (this.player.userData.shield) {
            this.player.remove(this.player.userData.shield);
        }
        
        const shieldGeometry = new THREE.SphereGeometry(4, 16, 16);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.userData.animationOffset = 0;
        this.player.add(shield);
        this.player.userData.shield = shield;
    }
    
    createShieldHitEffect() {
        // Create a brief visual feedback for shield hit without popup notification
        const flashGeometry = new THREE.SphereGeometry(5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00bbff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(this.player.position);
        this.scene.add(flash);
        
        // Animate the flash effect
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 300; // 300ms duration
            
            if (progress >= 1) {
                this.scene.remove(flash);
                return;
            }
            
            // Fade out and scale up
            flash.material.opacity = 0.8 * (1 - progress);
            flash.scale.setScalar(1 + progress * 0.5);
            
            requestAnimationFrame(animate);
        };
        animate();
    }
    
    showSubtlePowerUpFeedback(text, color) {
        // Only show during active gameplay as a subtle indicator
        if (this.gameState !== 'playing') return;
        
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #${color.toString(16).padStart(6, '0')};
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: bold;
            z-index: 150;
            pointer-events: none;
            transform: translateX(100%);
            transition: transform 0.3s ease, opacity 0.3s ease;
            opacity: 0;
        `;
        indicator.textContent = text;
        
        document.body.appendChild(indicator);
        
        // Animate in
        setTimeout(() => {
            indicator.style.transform = 'translateX(0)';
            indicator.style.opacity = '1';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            indicator.style.transform = 'translateX(100%)';
            indicator.style.opacity = '0';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }, 1500);
    }

    showPowerUpNotification(text, color) {
        // If we're actively playing, queue the notification for later
        if (this.gameState === 'playing') {
            this.notificationQueue.push({ text, color, timestamp: Date.now() });
            return;
        }
        
        // Show notification immediately if not playing
        this.displayNotification(text, color);
    }
    
    displayNotification(text, color) {
        // Don't show if we just showed one recently during gameplay
        const now = Date.now();
        if (this.gameState === 'playing' && now - this.lastNotificationTime < 1000) {
            return;
        }
        
        this.lastNotificationTime = now;
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #${color.toString(16).padStart(6, '0')};
            padding: 1rem 2rem;
            border-radius: 10px;
            font-size: 1.5rem;
            font-weight: bold;
            z-index: 200;
            pointer-events: none;
            animation: slideDown 0.5s ease-out, fadeOut 0.5s ease-out 2s;
        `;
        notification.textContent = text;
        
        // Add animation keyframes if not already added
        if (!document.getElementById('powerup-animations')) {
            const style = document.createElement('style');
            style.id = 'powerup-animations';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        this.currentNotification = notification;
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            if (this.currentNotification === notification) {
                this.currentNotification = null;
            }
        }, 2500);
    }
    
    processNotificationQueue() {
        // Process queued notifications when appropriate
        if (this.notificationQueue.length > 0 && 
            (this.gameState === 'paused' || this.gameState === 'gameover' || this.gameState === 'menu')) {
            
            const notification = this.notificationQueue.shift();
            this.displayNotification(notification.text, notification.color);
        }
    }

    createParticles(position, color, type = 'explosion') {
        const particleCount = type === 'explosion' ? 30 : 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            let geometry, material;
            
            if (type === 'explosion') {
                geometry = new THREE.SphereGeometry(0.3, 6, 6);
                material = new THREE.MeshBasicMaterial({ 
                    color: color || 0xff4400,
                    transparent: true,
                    opacity: 0.8
                });
            } else if (type === 'spark') {
                geometry = new THREE.SphereGeometry(0.1, 4, 4);
                material = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    emissive: 0xffff00,
                    emissiveIntensity: 0.5
                });
            } else {
                geometry = new THREE.SphereGeometry(0.2, 8, 8);
                material = new THREE.MeshBasicMaterial({ 
                    color: color || 0xffffff,
                    transparent: true,
                    opacity: 0.7
                });
            }
            
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 5 + 2,
                (Math.random() - 0.5) * 4
            );
            particle.userData.life = 1.0;
            particle.userData.initialScale = particle.scale.x;
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        this.particles.push(particles);
        
        // Add screen shake effect for explosions
        if (type === 'explosion') {
            this.addScreenShake(0.5, 0.2);
        }
    }
    
    addScreenShake(intensity, duration) {
        const originalPosition = this.camera.position.clone();
        const startTime = Date.now();
        
        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration * 1000) {
                const progress = elapsed / (duration * 1000);
                const currentIntensity = intensity * (1 - progress);
                
                this.camera.position.x = originalPosition.x + (Math.random() - 0.5) * currentIntensity;
                this.camera.position.y = originalPosition.y + (Math.random() - 0.5) * currentIntensity;
                this.camera.position.z = originalPosition.z + (Math.random() - 0.5) * currentIntensity;
                
                requestAnimationFrame(shake);
            } else {
                this.camera.position.copy(originalPosition);
            }
        };
        
        shake();
    }

    setupInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (this.gameState === 'playing') {
                if (e.key === 'ArrowLeft') this.moveLeft();
                if (e.key === 'ArrowRight') this.moveRight();
                if (e.key === 'Escape') this.pauseGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Enhanced touch controls
        const canvas = document.getElementById('game-canvas');
        let touchStartX = 0;
        let touchStartY = 0;
        let swipeThreshold = 50;
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            
            // Visual feedback for touch
            this.createTouchFeedback(touch.clientX, touch.clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!e.changedTouches[0]) return;
            
            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            if (this.gameState === 'playing') {
                // Horizontal swipes for lane changes
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
                    if (diffX > 0) {
                        this.moveRight();
                    } else {
                        this.moveLeft();
                    }
                }
                // Vertical swipes for actions (future: jump, brake)
                else if (Math.abs(diffY) > swipeThreshold) {
                    if (diffY < 0) {
                        // Swipe up - could be jump in future
                        console.log('Swipe up detected');
                    } else {
                        // Swipe down - could be brake in future
                        console.log('Swipe down detected');
                    }
                }
                // Tap for pause
                else if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) {
                    // Quick tap in center area pauses
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    if (Math.abs(touchEndX - centerX) < 100 && Math.abs(touchEndY - centerY) < 100) {
                        this.pauseGame();
                    }
                }
            }
        }, { passive: false });

        // Mouse click for lane change
        canvas.addEventListener('click', (e) => {
            if (this.gameState !== 'playing') return;
            
            const clickX = e.clientX;
            const centerX = window.innerWidth / 2;
            
            if (clickX < centerX - 100) this.moveLeft();
            else if (clickX > centerX + 100) this.moveRight();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    moveLeft() {
        if (this.playerLane > -1) {
            this.playerLane--;
            this.sounds.whoosh();
        }
    }

    moveRight() {
        if (this.playerLane < 1) {
            this.playerLane++;
            this.sounds.whoosh();
        }
    }

    setupWebXR() {
        // Check for WebXR support
        if ('xr' in navigator) {
            navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
                if (supported) {
                    const vrButton = document.getElementById('btn-vr');
                    vrButton.style.display = 'block';
                }
            });
        }
    }

    async enterVR() {
        if (!navigator.xr) return;
        
        try {
            const session = await navigator.xr.requestSession('immersive-vr', {
                requiredFeatures: ['local-floor']
            });
            
            this.xrSession = session;
            this.isVRActive = true;
            
            await this.renderer.xr.setSession(session);
            
            session.addEventListener('end', () => {
                this.isVRActive = false;
                this.xrSession = null;
            });
            
        } catch (error) {
            console.error('Failed to enter VR:', error);
            alert('VR not available or permission denied');
        }
    }

    async simulateLoading() {
        const progress = document.getElementById('loading-progress');
        const text = document.getElementById('loading-text');
        
        const steps = [
            { progress: 20, text: 'Initializing Three.js...' },
            { progress: 40, text: 'Loading assets...' },
            { progress: 60, text: 'Setting up audio...' },
            { progress: 80, text: 'Preparing game world...' },
            { progress: 100, text: 'Ready!' }
        ];
        
        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, 300));
            progress.style.width = step.progress + '%';
            text.textContent = step.text;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            z-index: 9999;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <h2>Error</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                margin-top: 1rem;
                padding: 0.5rem 1rem;
                background: white;
                color: red;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">Reload Game</button>
        `;
        document.body.appendChild(errorDiv);
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showMainMenu() {
        this.gameState = 'menu';
        document.getElementById('main-menu').classList.remove('hidden');
        this.updateUI();
        
        // Clear notification queue when returning to menu
        this.notificationQueue = [];
    }

    hideMainMenu() {
        document.getElementById('main-menu').classList.add('hidden');
    }

    startGame(mode) {
        this.currentMode = mode;
        this.gameState = 'playing';
        this.score = 0;
        this.distance = 0;
        this.speed = this.baseSpeed;
        this.timeElapsed = 0;
        this.obstacleSpawnTimer = 0;
        this.playerLane = 0;
        
        // Clear obstacles and power-ups
        this.obstacles.forEach(obs => this.scene.remove(obs));
        this.obstacles = [];
        this.powerUps.forEach(powerUp => this.scene.remove(powerUp));
        this.powerUps = [];
        this.activePowerUps.clear();
        
        // Reset player position
        this.player.position.set(0, 1, 20);
        
        // Initialize weather system
        this.createWeatherSystem();
        
        // Show HUD
        this.hideMainMenu();
        document.getElementById('game-hud').classList.remove('hidden');
        
        // Hide/show timer based on mode
        if (mode === 'timeattack') {
            document.getElementById('hud-timer-container').style.display = 'flex';
        } else {
            document.getElementById('hud-timer-container').style.display = 'none';
        }
        
        // Start audio (engine sound disabled - was obnoxious)
        // this.startEngineSound();
        if (this.musicLoop && this.audioContext && this.audioContext.state !== 'suspended') {
            this.musicLoop();
        }
    }

    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'paused';
        document.getElementById('pause-menu').classList.remove('hidden');
        this.stopEngineSound();
        
        // Process any queued notifications now that we're paused
        this.processNotificationQueue();
    }

    resumeGame() {
        this.gameState = 'playing';
        document.getElementById('pause-menu').classList.add('hidden');
        // Engine sound disabled - was obnoxious
        // this.startEngineSound();
    }

    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('game-hud').classList.add('hidden');
        this.stopEngineSound();
        
        // Process any queued notifications now that game is over
        this.processNotificationQueue();
        
        // Calculate XP earned
        const baseXP = Math.floor(this.score / 10);
        const xpMultiplier = 1 + (playerProgress.skills.xpBoost * 0.2);
        const xpEarned = Math.floor(baseXP * xpMultiplier);
        
        // Update progress
        const leveledUp = playerProgress.addXP(xpEarned);
        
        // Update leaderboard
        playerProgress.addScore(this.currentMode, this.score);
        
        // Save progress
        playerProgress.save();
        
        // Show game over screen
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-distance').textContent = Math.floor(this.distance);
        document.getElementById('xp-earned').textContent = xpEarned;
        
        if (leveledUp) {
            document.getElementById('level-up-message').classList.remove('hidden');
        } else {
            document.getElementById('level-up-message').classList.add('hidden');
        }
        
        document.getElementById('game-over-screen').classList.remove('hidden');
        
        // Play crash sound
        this.sounds.crash();
    }

    quitToMenu() {
        document.getElementById('game-hud').classList.add('hidden');
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.showMainMenu();
        // Engine sound disabled - was obnoxious
        // this.stopEngineSound();
    }

    updateGame(delta) {
        if (this.gameState !== 'playing') return;
        
        // Update time
        this.timeElapsed += delta;
        
        // Update speed based on mode, skills, and power-ups
        const speedBoost = 1 + (playerProgress.skills.speed * 0.1);
        let powerUpSpeedMultiplier = 1;
        
        if (this.activePowerUps.has('speed') && this.activePowerUps.get('speed') > Date.now()) {
            powerUpSpeedMultiplier = 1.5;
        }
        
        if (this.activePowerUps.has('slowmo') && this.activePowerUps.get('slowmo') > Date.now()) {
            powerUpSpeedMultiplier = 0.5;
        }
        
        this.speed = Math.min(this.baseSpeed * (1 + this.timeElapsed / 60) * speedBoost * powerUpSpeedMultiplier, this.maxSpeed);
        
        // Update player lane position
        const targetX = this.playerLane * 10;
        const handling = 1 + (playerProgress.skills.handling * 0.2);
        this.player.position.x += (targetX - this.player.position.x) * 0.1 * handling;
        
        // Rotate wheels
        if (this.player.userData.wheels) {
            this.player.userData.wheels.forEach(wheel => {
                wheel.rotation.x -= this.speed * delta * 0.1;
            });
        }
        
        // Update road
        this.roadSegments.forEach(segment => {
            segment.position.z += this.speed * delta;
            if (segment.position.z > 50) {
                segment.position.z -= this.roadSegments.length * 50;
            }
        });
        
        // Spawn obstacles and power-ups
        this.obstacleSpawnTimer += delta;
        const spawnRate = Math.max(1.5 - (this.timeElapsed / 120), 0.5);
        
        if (this.obstacleSpawnTimer > spawnRate) {
            // 20% chance to spawn power-up instead of obstacle
            if (Math.random() < 0.2) {
                this.createPowerUp();
            } else {
                this.createObstacle();
            }
            this.obstacleSpawnTimer = 0;
        }
        
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.position.z += this.speed * delta;
            
            // Remove if passed
            if (obstacle.position.z > 30) {
                this.scene.remove(obstacle);
                this.obstacles.splice(i, 1);
                this.score += 10;
                continue;
            }
            
            // Collision detection (check for shield power-up)
            const hasShield = this.activePowerUps.has('shield') && this.activePowerUps.get('shield') > Date.now();
            const distX = Math.abs(this.player.position.x - obstacle.position.x);
            const distZ = Math.abs(this.player.position.z - obstacle.position.z);
            
            if (distX < 3 && distZ < 4) {
                if (hasShield) {
                    // Shield absorbs hit
                    this.createParticles(obstacle.position, 0x0088ff, 'spark');
                    this.activePowerUps.delete('shield');
                    if (this.player.userData.shield) {
                        this.player.remove(this.player.userData.shield);
                        this.player.userData.shield = null;
                    }
                    // Queue notification instead of showing immediately during gameplay
                    this.showPowerUpNotification('Shield Absorbed Hit!', 0x0088ff);
                    // Add subtle visual feedback for shield hit
                    this.createShieldHitEffect();
                    this.showSubtlePowerUpFeedback('SAVED!', 0x0088ff);
                    this.scene.remove(obstacle);
                    this.obstacles.splice(i, 1);
                } else {
                    this.createParticles(obstacle.position, 0xff3300, 'explosion');
                    this.createParticles(this.player.position, 0xffff00, 'spark');
                    this.gameOver();
                    return;
                }
            }
        }
        
        // Update power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.position.z += this.speed * delta;
            
            // Animate power-up
            powerUp.rotation.x += delta * powerUp.userData.rotationSpeed;
            powerUp.rotation.y += delta * powerUp.userData.rotationSpeed * 0.7;
            powerUp.position.y = powerUp.userData.originalY + Math.sin(Date.now() * 0.005 + powerUp.userData.bobOffset) * 0.5;
            
            // Remove if passed
            if (powerUp.position.z > 30) {
                this.scene.remove(powerUp);
                this.powerUps.splice(i, 1);
                continue;
            }
            
            // Magnet effect
            if (this.activePowerUps.has('magnet') && this.activePowerUps.get('magnet') > Date.now()) {
                const magnetForce = 0.2;
                const diffX = this.player.position.x - powerUp.position.x;
                const diffZ = this.player.position.z - powerUp.position.z;
                const distance = Math.sqrt(diffX * diffX + diffZ * diffZ);
                
                if (distance < 20 && distance > 1) {
                    const forceX = (diffX / distance) * magnetForce;
                    const forceZ = (diffZ / distance) * magnetForce;
                    powerUp.position.x += forceX;
                    powerUp.position.z += forceZ;
                }
            }
            
            // Collision detection with power-ups
            const distX = Math.abs(this.player.position.x - powerUp.position.x);
            const distZ = Math.abs(this.player.position.z - powerUp.position.z);
            
            if (distX < 2 && distZ < 3) {
                this.collectPowerUp(powerUp);
            }
        }
        
        // Update active power-ups
        const now = Date.now();
        for (const [type, endTime] of this.activePowerUps.entries()) {
            if (endTime <= now) {
                this.activePowerUps.delete(type);
                if (type === 'shield' && this.player.userData.shield) {
                    this.player.remove(this.player.userData.shield);
                    this.player.userData.shield = null;
                }
            }
        }
        
        // Update shield effect
        if (this.player.userData.shield) {
            this.player.userData.shield.userData.animationOffset += delta * 3;
            this.player.userData.shield.material.opacity = 0.3 + Math.sin(this.player.userData.shield.userData.animationOffset) * 0.1;
            this.player.userData.shield.rotation.y += delta * 2;
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particleGroup = this.particles[i];
            let allDead = true;
            
            particleGroup.children.forEach(particle => {
                particle.userData.life -= delta * 0.8;
                if (particle.userData.life > 0) {
                    // Update position
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
                    particle.userData.velocity.y -= 9.8 * delta; // Gravity
                    particle.userData.velocity.multiplyScalar(0.98); // Air resistance
                    
                    // Update visual properties
                    particle.material.opacity = particle.userData.life;
                    particle.scale.setScalar(particle.userData.initialScale * particle.userData.life);
                    
                    // Add some rotation for visual interest
                    particle.rotation.x += delta * 2;
                    particle.rotation.y += delta * 3;
                    
                    allDead = false;
                } else {
                    particle.visible = false;
                }
            });
            
            if (allDead) {
                this.scene.remove(particleGroup);
                this.particles.splice(i, 1);
            }
        }
        
        // Update distance and score
        this.distance += this.speed * delta;
        this.score += Math.floor(this.speed * delta * 0.1);
        
        // Update engine sound (disabled)
        // this.updateEngineSound();
        
        // Update weather
        this.updateWeather(delta);
        
        // Update speed lines effect
        this.updateSpeedLines();
        
        // Update HUD
        this.updateHUD();
        
        // Mode-specific logic
        if (this.currentMode === 'timeattack') {
            // Time Attack: 60 second limit
            if (this.timeElapsed >= 60) {
                this.gameOver();
            }
        } else if (this.currentMode === 'survival') {
            // Survival: Obstacles spawn faster
            // Already handled by spawn rate
        }
    }

    updateHUD() {
        // Track previous values for animations
        if (!this.hudPrevValues) {
            this.hudPrevValues = {};
        }
        
        const score = Math.floor(this.score);
        const speed = Math.floor(this.speed);
        const distance = Math.floor(this.distance);
        
        const scoreElement = document.getElementById('hud-score');
        const speedElement = document.getElementById('hud-speed');
        const distanceElement = document.getElementById('hud-distance');
        
        // Animate changes
        if (this.hudPrevValues.score !== score) {
            this.animateValueChange(scoreElement, score);
            this.hudPrevValues.score = score;
        }
        
        if (this.hudPrevValues.speed !== speed) {
            this.animateValueChange(speedElement, speed);
            this.hudPrevValues.speed = speed;
        }
        
        if (this.hudPrevValues.distance !== distance) {
            this.animateValueChange(distanceElement, distance);
            this.hudPrevValues.distance = distance;
        }
        
        const minutes = Math.floor(this.timeElapsed / 60);
        const seconds = Math.floor(this.timeElapsed % 60);
        document.getElementById('hud-timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update power-up indicators
        this.updatePowerUpHUD();
    }

    animateValueChange(element, newValue) {
        element.textContent = newValue;
        element.classList.add('changing');
        setTimeout(() => {
            element.classList.remove('changing');
        }, 400);
    }

    updatePowerUpHUD() {
        const powerUpContainer = document.getElementById('hud-powerups');
        powerUpContainer.innerHTML = '';
        
        const now = Date.now();
        
        for (const [type, endTime] of this.activePowerUps.entries()) {
            if (endTime > now) {
                const remaining = Math.ceil((endTime - now) / 1000);
                
                const indicator = document.createElement('div');
                indicator.className = `powerup-indicator ${type}`;
                
                const icon = document.createElement('div');
                icon.className = `powerup-icon ${type}`;
                
                const text = document.createElement('div');
                text.className = 'powerup-text';
                text.textContent = {
                    speed: 'Speed',
                    shield: 'Shield',
                    slowmo: 'Slow-Mo',
                    magnet: 'Magnet'
                }[type];
                
                const timer = document.createElement('div');
                timer.className = 'powerup-timer';
                timer.textContent = `${remaining}s`;
                
                indicator.appendChild(icon);
                indicator.appendChild(text);
                indicator.appendChild(timer);
                
                powerUpContainer.appendChild(indicator);
            }
        }
    }

    createWeatherSystem() {
        const weathers = ['clear', 'rain', 'snow', 'fog'];
        this.currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
        
        // Remove existing weather
        if (this.weatherSystem) {
            this.scene.remove(this.weatherSystem);
        }
        
        switch(this.currentWeather) {
            case 'rain':
                this.createRain();
                break;
            case 'snow':
                this.createSnow();
                break;
            case 'fog':
                this.createFog();
                break;
            default:
                // Clear weather - no special effects
                break;
        }
        
        console.log(`Weather changed to: ${this.currentWeather}`);
    }

    createRain() {
        // Reduce particle count on mobile
        const rainCount = this.isMobile ? 500 : 1000;
        const rainGeometry = new THREE.BufferGeometry();
        const rainPositions = [];
        const rainVelocities = [];
        
        for (let i = 0; i < rainCount; i++) {
            rainPositions.push(
                (Math.random() - 0.5) * 200,  // x
                Math.random() * 100 + 50,     // y
                (Math.random() - 0.5) * 200   // z
            );
            rainVelocities.push(0, -80, -10); // Falling velocity
        }
        
        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));
        rainGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(rainVelocities, 3));
        
        const rainMaterial = new THREE.PointsMaterial({
            color: 0x8888ff,
            size: 2,
            transparent: true,
            opacity: 0.6
        });
        
        this.weatherSystem = new THREE.Points(rainGeometry, rainMaterial);
        this.weatherSystem.userData.type = 'rain';
        this.scene.add(this.weatherSystem);
        
        // Adjust scene fog and lighting for rain
        this.scene.fog.density = 0.01;
        this.scene.background = new THREE.Color(0x0a0a15);
    }

    createSnow() {
        // Reduce particle count on mobile
        const snowCount = this.isMobile ? 250 : 500;
        const snowGeometry = new THREE.BufferGeometry();
        const snowPositions = [];
        
        for (let i = 0; i < snowCount; i++) {
            snowPositions.push(
                (Math.random() - 0.5) * 200,  // x
                Math.random() * 100 + 50,     // y
                (Math.random() - 0.5) * 200   // z
            );
        }
        
        snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));
        
        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 4,
            transparent: true,
            opacity: 0.8
        });
        
        this.weatherSystem = new THREE.Points(snowGeometry, snowMaterial);
        this.weatherSystem.userData.type = 'snow';
        this.scene.add(this.weatherSystem);
        
        // Adjust scene for snow
        this.scene.background = new THREE.Color(0x0f0f1f);
    }

    createFog() {
        // Heavy fog effect
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.05);
        this.scene.background = new THREE.Color(0x080808);
        
        // Create volumetric fog effect with particles (reduce on mobile)
        const fogCount = this.isMobile ? 100 : 200;
        const fogGeometry = new THREE.BufferGeometry();
        const fogPositions = [];
        
        for (let i = 0; i < fogCount; i++) {
            fogPositions.push(
                (Math.random() - 0.5) * 100,  // x
                Math.random() * 30,           // y
                (Math.random() - 0.5) * 200   // z
            );
        }
        
        fogGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fogPositions, 3));
        
        const fogMaterial = new THREE.PointsMaterial({
            color: 0x444444,
            size: 15,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        
        this.weatherSystem = new THREE.Points(fogGeometry, fogMaterial);
        this.weatherSystem.userData.type = 'fog';
        this.scene.add(this.weatherSystem);
    }

    updateWeather(delta) {
        if (!this.weatherSystem) return;
        
        const positions = this.weatherSystem.geometry.attributes.position.array;
        
        if (this.weatherSystem.userData.type === 'rain') {
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 80 * delta; // Fall down
                positions[i + 2] += this.speed * delta; // Move with world
                
                // Reset raindrops when they fall too low or move too far
                if (positions[i + 1] < 0 || positions[i + 2] > 50) {
                    positions[i] = (Math.random() - 0.5) * 200;
                    positions[i + 1] = Math.random() * 100 + 50;
                    positions[i + 2] = -150;
                }
            }
        } else if (this.weatherSystem.userData.type === 'snow') {
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.5; // Sway
                positions[i + 1] -= 20 * delta; // Fall down slowly
                positions[i + 2] += this.speed * delta; // Move with world
                
                if (positions[i + 1] < 0 || positions[i + 2] > 50) {
                    positions[i] = (Math.random() - 0.5) * 200;
                    positions[i + 1] = Math.random() * 100 + 50;
                    positions[i + 2] = -150;
                }
            }
        } else if (this.weatherSystem.userData.type === 'fog') {
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += Math.sin(Date.now() * 0.0005 + i) * 0.2; // Drift
                positions[i + 2] += this.speed * delta * 0.5; // Move with world
                
                if (positions[i + 2] > 50) {
                    positions[i] = (Math.random() - 0.5) * 100;
                    positions[i + 1] = Math.random() * 30;
                    positions[i + 2] = -150;
                }
            }
        }
        
        this.weatherSystem.geometry.attributes.position.needsUpdate = true;
    }

    createSpeedLines() {
        this.speedLinesContainer = document.createElement('div');
        this.speedLinesContainer.className = 'speed-lines';
        
        // Create multiple speed lines
        for (let i = 0; i < 20; i++) {
            const line = document.createElement('div');
            line.className = 'speed-line';
            line.style.left = Math.random() * 100 + '%';
            line.style.animationDelay = Math.random() * 0.5 + 's';
            line.style.animationDuration = (0.3 + Math.random() * 0.4) + 's';
            this.speedLinesContainer.appendChild(line);
        }
        
        document.body.appendChild(this.speedLinesContainer);
    }

    updateSpeedLines() {
        if (!this.speedLinesContainer) return;
        
        const speedRatio = this.speed / this.maxSpeed;
        
        if (speedRatio > 0.7) {
            this.speedLinesContainer.classList.add('active');
        } else {
            this.speedLinesContainer.classList.remove('active');
        }
    }

    createTouchFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            left: ${x - 25}px;
            top: ${y - 25}px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 212, 255, 0.6) 0%, transparent 70%);
            pointer-events: none;
            z-index: 1000;
            animation: touchRipple 0.6s ease-out forwards;
        `;
        
        // Add animation keyframes if not already added
        if (!document.getElementById('touch-animations')) {
            const style = document.createElement('style');
            style.id = 'touch-animations';
            style.textContent = `
                @keyframes touchRipple {
                    0% {
                        transform: scale(0);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }

    updateUI() {
        // Update player stats in menu with animations
        const levelElement = document.getElementById('player-level');
        const xpElement = document.getElementById('player-xp');
        const xpNeededElement = document.getElementById('player-xp-needed');
        const skillPointsElement = document.getElementById('skill-points');
        
        if (levelElement.textContent != playerProgress.level) {
            this.animateValueChange(levelElement, playerProgress.level);
        } else {
            levelElement.textContent = playerProgress.level;
        }
        
        if (xpElement.textContent != playerProgress.xp) {
            this.animateValueChange(xpElement, playerProgress.xp);
        } else {
            xpElement.textContent = playerProgress.xp;
        }
        
        xpNeededElement.textContent = playerProgress.getXPForNextLevel();
        
        if (skillPointsElement.textContent != playerProgress.skillPoints) {
            this.animateValueChange(skillPointsElement, playerProgress.skillPoints);
        } else {
            skillPointsElement.textContent = playerProgress.skillPoints;
        }
        
        // Update XP bar with smooth animation
        const xpProgress = (playerProgress.xp / playerProgress.getXPForNextLevel()) * 100;
        const xpBar = document.getElementById('xp-progress');
        xpBar.style.width = xpProgress + '%';
        
        // Update mode unlocks
        const timeAttackBtn = document.getElementById('btn-time-attack');
        const survivalBtn = document.getElementById('btn-survival');
        
        if (playerProgress.level >= 5) {
            timeAttackBtn.disabled = false;
            timeAttackBtn.textContent = 'Time Attack';
        }
        
        if (playerProgress.level >= 10) {
            survivalBtn.disabled = false;
            survivalBtn.textContent = 'Survival';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        try {
            const now = performance.now();
            
            // Performance monitoring
            this.performanceMonitor.frameCount++;
            if (now - this.performanceMonitor.lastTime >= 1000) {
                this.performanceMonitor.fps = this.performanceMonitor.frameCount;
                this.performanceMonitor.frameCount = 0;
                this.performanceMonitor.lastTime = now;
                
                // Adaptive quality adjustment
                if (this.performanceMonitor.adaptiveQuality && this.isMobile) {
                    if (this.performanceMonitor.fps < 30) {
                        this.reducedQuality = true;
                    } else if (this.performanceMonitor.fps > 50) {
                        this.reducedQuality = false;
                    }
                }
            }
            
            const delta = 1 / 60; // Fixed timestep for consistency
            
            this.updateGame(delta);
            
            // Sync remote players in multiplayer
            if (this.connections.length > 0 && this.gameState === 'playing') {
                this.broadcastPlayerPosition();
            }
            
            // Only render if renderer and scene are properly initialized
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            console.error('Animation loop error:', error);
            // Continue running but log the error
        }
    }

    // WebRTC Multiplayer Methods
    hostMultiplayer() {
        this.roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.isHost = true;
        
        document.getElementById('room-id').textContent = this.roomId;
        document.getElementById('mp-status').textContent = 'Hosting - Waiting for players...';
        
        // In a real implementation, you'd use a signaling server
        // This is a simplified version showing the structure
        alert(`Room created! Share this ID with others: ${this.roomId}\n\nNote: Full WebRTC implementation requires a signaling server.`);
    }

    joinMultiplayer(roomId) {
        if (!roomId) {
            alert('Please enter a Room ID');
            return;
        }
        
        // Check if SimplePeer is available
        if (typeof SimplePeer === 'undefined') {
            alert('Multiplayer not available - SimplePeer library not loaded');
            return;
        }
        
        this.roomId = roomId;
        document.getElementById('mp-status').textContent = 'Connecting...';
        
        try {
            this.peer = new SimplePeer({ initiator: true, trickle: false });
            
            this.peer.on('signal', data => {
                // In production, send this to signaling server
                console.log('Signal data:', data);
                // For now, show the signal data to be shared manually
                const signalStr = JSON.stringify(data);
                prompt('Copy this signal and send to the other player:', signalStr);
            });
            
            this.peer.on('connect', () => {
                document.getElementById('mp-status').textContent = 'Connected!';
                this.addPlayerTag('Player 2');
            });
            
            this.peer.on('data', data => {
                try {
                    this.handleMultiplayerData(JSON.parse(data));
                } catch (e) {
                    console.error('Invalid multiplayer data:', e);
                }
            });
            
            this.peer.on('error', err => {
                console.error('Peer error:', err);
                document.getElementById('mp-status').textContent = 'Connection failed: ' + err.message;
            });
            
        } catch (error) {
            console.error('Multiplayer error:', error);
            document.getElementById('mp-status').textContent = 'Failed to initialize multiplayer';
            alert('Multiplayer connection failed: ' + error.message);
        }
    }

    addPlayerTag(name) {
        const playersDiv = document.getElementById('connected-players');
        const tag = document.createElement('div');
        tag.className = 'player-tag';
        tag.textContent = name;
        playersDiv.appendChild(tag);
    }

    broadcastPlayerPosition() {
        if (!this.peer || !this.peer.connected) return;
        
        const data = {
            type: 'position',
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z,
            lane: this.playerLane
        };
        
        try {
            this.peer.send(JSON.stringify(data));
        } catch (error) {
            console.error('Failed to send position:', error);
        }
    }

    handleMultiplayerData(data) {
        if (data.type === 'position') {
            // Update remote player position
            if (!this.remotePlayers[data.playerId]) {
                this.createRemotePlayer(data.playerId);
            }
            
            const remotePlayer = this.remotePlayers[data.playerId];
            if (remotePlayer) {
                remotePlayer.position.set(data.x, data.y, data.z);
            }
        }
    }

    createRemotePlayer(playerId) {
        // Create a simple representation of remote player
        const geometry = new THREE.BoxGeometry(3, 1.5, 5);
        const material = new THREE.MeshStandardMaterial({ color: 0xff00ff, opacity: 0.7, transparent: true });
        const remotePlayer = new THREE.Mesh(geometry, material);
        
        this.scene.add(remotePlayer);
        this.remotePlayers[playerId] = remotePlayer;
    }
}

// Player Progress System
class PlayerProgress {
    constructor() {
        this.level = 1;
        this.xp = 0;
        this.skillPoints = 0;
        this.skills = {
            speed: 0,
            xpBoost: 0,
            handling: 0
        };
        this.vehicles = [
            { id: 'basic', name: 'Basic Car', unlocked: true, color: 0x00d4ff, speed: 1.0, handling: 1.0 },
            { id: 'sports', name: 'Sports Car', unlocked: false, unlockLevel: 5, color: 0xff0000, speed: 1.3, handling: 1.2 },
            { id: 'super', name: 'Super Car', unlocked: false, unlockLevel: 10, color: 0xffff00, speed: 1.5, handling: 1.4 },
            { id: 'hyper', name: 'Hyper Car', unlocked: false, unlockLevel: 20, color: 0xff00ff, speed: 2.0, handling: 1.8 }
        ];
        this.currentVehicle = 'basic';
        this.leaderboards = {
            classic: [],
            timeattack: [],
            survival: []
        };
        // User management
        this.username = null;
        this.isGuest = false;
    }

    async load() {
        try {
            const saved = localStorage.getItem('ultimateReactionDriver');
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(this, data);
                
                // Unlock vehicles based on level
                this.vehicles.forEach(vehicle => {
                    if (vehicle.unlockLevel && this.level >= vehicle.unlockLevel) {
                        vehicle.unlocked = true;
                    }
                });
            }
            
            // Load username from separate storage
            this.username = localStorage.getItem('urd_username');
            this.isGuest = localStorage.getItem('urd_is_guest') === 'true';
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    save() {
        try {
            localStorage.setItem('ultimateReactionDriver', JSON.stringify(this));
            // Save username separately for easier access
            if (this.username) {
                localStorage.setItem('urd_username', this.username);
            }
            localStorage.setItem('urd_is_guest', this.isGuest.toString());
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    setUser(username, isGuest = false) {
        this.username = username;
        this.isGuest = isGuest;
        this.save();
    }

    clearUser() {
        this.username = null;
        this.isGuest = false;
        localStorage.removeItem('urd_username');
        localStorage.removeItem('urd_is_guest');
    }

    getDisplayName() {
        if (this.isGuest || !this.username) {
            return 'Guest';
        }
        return this.username;
    }

    canTrackLeaderboard() {
        return !this.isGuest && this.username;
    }

    addXP(amount) {
        this.xp += amount;
        const xpNeeded = this.getXPForNextLevel();
        
        if (this.xp >= xpNeeded) {
            this.levelUp();
            return true;
        }
        return false;
    }

    levelUp() {
        this.xp -= this.getXPForNextLevel();
        this.level++;
        this.skillPoints++;
        
        // Unlock vehicles
        this.vehicles.forEach(vehicle => {
            if (vehicle.unlockLevel && this.level >= vehicle.unlockLevel) {
                vehicle.unlocked = true;
            }
        });
        
        this.save();
    }

    getXPForNextLevel() {
        return Math.floor(100 * Math.pow(1.5, this.level - 1));
    }

    upgradeSkill(skillName) {
        if (this.skillPoints <= 0) return false;
        if (this.skills[skillName] >= 5) return false;
        
        this.skills[skillName]++;
        this.skillPoints--;
        this.save();
        return true;
    }

    getCurrentVehicle() {
        return this.vehicles.find(v => v.id === this.currentVehicle);
    }

    selectVehicle(vehicleId) {
        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        if (vehicle && vehicle.unlocked) {
            this.currentVehicle = vehicleId;
            this.save();
            return true;
        }
        return false;
    }

    addScore(mode, score) {
        if (!this.leaderboards[mode]) {
            this.leaderboards[mode] = [];
        }
        
        const entry = {
            score: score,
            date: new Date().toISOString(),
            username: this.getDisplayName(),
            isGuest: this.isGuest
        };
        
        this.leaderboards[mode].push(entry);
        
        // Keep only top 10
        this.leaderboards[mode].sort((a, b) => b.score - a.score);
        this.leaderboards[mode] = this.leaderboards[mode].slice(0, 10);
        
        this.save();
    }
}

// User Management System
class UserManager {
    static validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }
        
        const trimmed = username.trim();
        
        if (trimmed.length < 3) {
            return { valid: false, error: 'Username must be at least 3 characters long' };
        }
        
        if (trimmed.length > 15) {
            return { valid: false, error: 'Username must be no more than 15 characters long' };
        }
        
        if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
            return { valid: false, error: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' };
        }
        
        return { valid: true, username: trimmed };
    }
    
    static saveUsername(username) {
        if (!username || username.trim() === '') {
            // Set as guest
            playerProgress.setUser('Guest', true);
            this.updateUsernameDisplay();
            return { success: true, message: 'Playing as Guest' };
        }
        
        const validation = this.validateUsername(username);
        if (!validation.valid) {
            return { success: false, message: validation.error };
        }
        
        playerProgress.setUser(validation.username, false);
        this.updateUsernameDisplay();
        return { success: true, message: 'Username saved!' };
    }
    
    static updateUsernameDisplay() {
        const displayName = playerProgress.getDisplayName();
        const currentUsernameElement = document.getElementById('current-username-display');
        if (currentUsernameElement) {
            currentUsernameElement.textContent = displayName;
        }
    }
    
    static loadUsernameInSettings() {
        const usernameInput = document.getElementById('settings-username');
        if (usernameInput) {
            if (playerProgress.isGuest || !playerProgress.username) {
                usernameInput.value = '';
            } else {
                usernameInput.value = playerProgress.username;
            }
        }
        this.updateUsernameDisplay();
    }
    
    static showUsernameMessage(message, isError = false) {
        // Create or update message element
        const settingsItem = document.getElementById('settings-username').closest('.setting-item');
        let messageElement = settingsItem.querySelector('.username-message');
        
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.className = 'username-message';
            settingsItem.appendChild(messageElement);
        }
        
        messageElement.textContent = message;
        messageElement.style.color = isError ? '#ff006e' : '#00d4ff';
        messageElement.style.fontSize = '0.9rem';
        messageElement.style.marginTop = '0.5rem';
        
        // Clear message after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.textContent = '';
            }
        }, 3000);
    }
}

// Global instances
const playerProgress = new PlayerProgress();
let game;

// UI Event Handlers
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize game
    game = new GameEngine();
    
    // Load player progress
    await playerProgress.load();
    
    // If no username is set, default to guest
    if (!playerProgress.username) {
        playerProgress.setUser('Guest', true);
    }
    
    // Main menu buttons
    document.getElementById('btn-classic').addEventListener('click', () => {
        game.startGame('classic');
    });
    
    document.getElementById('btn-time-attack').addEventListener('click', () => {
        if (playerProgress.level >= 5) {
            game.startGame('timeattack');
        }
    });
    
    document.getElementById('btn-survival').addEventListener('click', () => {
        if (playerProgress.level >= 10) {
            game.startGame('survival');
        }
    });
    
    document.getElementById('btn-multiplayer').addEventListener('click', () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('multiplayer-menu').classList.remove('hidden');
    });
    
    document.getElementById('btn-garage').addEventListener('click', () => {
        showGarage();
    });
    
    document.getElementById('btn-skills').addEventListener('click', () => {
        showSkills();
    });
    
    document.getElementById('btn-leaderboard').addEventListener('click', () => {
        showLeaderboard();
    });
    
    document.getElementById('btn-settings').addEventListener('click', () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('settings-menu').classList.remove('hidden');
        // Load current username into settings
        UserManager.loadUsernameInSettings();
    });
    
    // HUD buttons
    document.getElementById('btn-pause').addEventListener('click', () => {
        game.pauseGame();
    });
    
    document.getElementById('btn-vr').addEventListener('click', () => {
        game.enterVR();
    });
    
    // Pause menu
    document.getElementById('btn-resume').addEventListener('click', () => {
        game.resumeGame();
    });
    
    document.getElementById('btn-quit').addEventListener('click', () => {
        game.quitToMenu();
    });
    
    // Game over
    document.getElementById('btn-retry').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        game.startGame(game.currentMode);
    });
    
    document.getElementById('btn-game-over-menu').addEventListener('click', () => {
        game.quitToMenu();
    });
    
    // Garage
    document.getElementById('btn-garage-back').addEventListener('click', () => {
        document.getElementById('garage-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
    
    // Skills
    document.getElementById('btn-skill-speed').addEventListener('click', () => {
        if (playerProgress.upgradeSkill('speed')) {
            updateSkillsDisplay();
            game.updateUI();
        }
    });
    
    document.getElementById('btn-skill-xp').addEventListener('click', () => {
        if (playerProgress.upgradeSkill('xpBoost')) {
            updateSkillsDisplay();
            game.updateUI();
        }
    });
    
    document.getElementById('btn-skill-handling').addEventListener('click', () => {
        if (playerProgress.upgradeSkill('handling')) {
            updateSkillsDisplay();
            game.updateUI();
        }
    });
    
    document.getElementById('btn-skills-back').addEventListener('click', () => {
        document.getElementById('skills-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
    
    // Leaderboard
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateLeaderboard(e.target.dataset.mode);
        });
    });
    
    document.getElementById('btn-leaderboard-back').addEventListener('click', () => {
        document.getElementById('leaderboard-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
    
    // Multiplayer
    document.getElementById('btn-host').addEventListener('click', () => {
        game.hostMultiplayer();
    });
    
    document.getElementById('btn-join').addEventListener('click', () => {
        const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();
        game.joinMultiplayer(roomId);
    });
    
    document.getElementById('btn-multiplayer-back').addEventListener('click', () => {
        document.getElementById('multiplayer-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
    
    // Settings
    document.getElementById('btn-save-username').addEventListener('click', () => {
        const username = document.getElementById('settings-username').value;
        const result = UserManager.saveUsername(username);
        UserManager.showUsernameMessage(result.message, !result.success);
    });
    
    // Enter key for username save
    document.getElementById('settings-username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-save-username').click();
        }
    });
    
    document.getElementById('btn-settings-back').addEventListener('click', () => {
        document.getElementById('settings-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });
    
    // Settings controls
    document.getElementById('music-volume').addEventListener('input', (e) => {
        // Adjust music volume (would be implemented with actual audio)
        const volume = e.target.value / 100;
        if (game.audioContext && game.sounds.engine.gainNode) {
            game.sounds.engine.gainNode.gain.value = volume * 0.1;
        }
    });
    
    document.getElementById('graphics-quality').addEventListener('change', (e) => {
        const quality = e.target.value;
        // Adjust graphics quality
        if (quality === 'low') {
            game.renderer.setPixelRatio(1);
            game.renderer.shadowMap.enabled = false;
        } else if (quality === 'medium') {
            game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            game.renderer.shadowMap.enabled = true;
        } else {
            game.renderer.setPixelRatio(window.devicePixelRatio);
            game.renderer.shadowMap.enabled = true;
        }
    });
});

function showGarage() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('garage-menu').classList.remove('hidden');
    
    const vehicleList = document.getElementById('vehicle-list');
    vehicleList.innerHTML = '';
    
    playerProgress.vehicles.forEach(vehicle => {
        const item = document.createElement('div');
        item.className = 'vehicle-item';
        if (!vehicle.unlocked) item.classList.add('locked');
        if (vehicle.id === playerProgress.currentVehicle) item.classList.add('selected');
        
        item.innerHTML = `
            <div class="vehicle-name">${vehicle.name}</div>
            <div class="vehicle-stats">
                Speed: ${vehicle.speed}x<br>
                Handling: ${vehicle.handling}x
            </div>
            <div class="vehicle-level">
                ${vehicle.unlocked ? 'Unlocked' : `Unlock at Level ${vehicle.unlockLevel}`}
            </div>
        `;
        
        if (vehicle.unlocked) {
            item.addEventListener('click', () => {
                if (playerProgress.selectVehicle(vehicle.id)) {
                    showGarage(); // Refresh
                }
            });
        }
        
        vehicleList.appendChild(item);
    });
}

function showSkills() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('skills-menu').classList.remove('hidden');
    updateSkillsDisplay();
}

function updateSkillsDisplay() {
    document.getElementById('available-skill-points').textContent = playerProgress.skillPoints;
    document.getElementById('skill-speed-level').textContent = playerProgress.skills.speed;
    document.getElementById('skill-xp-level').textContent = playerProgress.skills.xpBoost;
    document.getElementById('skill-handling-level').textContent = playerProgress.skills.handling;
    
    // Update button states
    document.getElementById('btn-skill-speed').disabled = 
        playerProgress.skillPoints === 0 || playerProgress.skills.speed >= 5;
    document.getElementById('btn-skill-xp').disabled = 
        playerProgress.skillPoints === 0 || playerProgress.skills.xpBoost >= 5;
    document.getElementById('btn-skill-handling').disabled = 
        playerProgress.skillPoints === 0 || playerProgress.skills.handling >= 5;
}

function showLeaderboard() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('leaderboard-menu').classList.remove('hidden');
    updateLeaderboard('classic');
}

function updateLeaderboard(mode) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    const scores = playerProgress.leaderboards[mode] || [];
    
    if (scores.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #a0a0b0;">No scores yet</p>';
        return;
    }
    
    scores.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-entry';
        
        // Add special styling for top 3
        let rankClass = 'leaderboard-rank';
        if (index === 0) rankClass += ' top-rank';
        else if (index === 1) rankClass += ' second-rank';
        else if (index === 2) rankClass += ' third-rank';
        
        // Show username or "Guest" for older entries without usernames
        const displayName = entry.username || 'Anonymous';
        const isCurrentUser = !entry.isGuest && entry.username === playerProgress.username;
        const userNameClass = isCurrentUser ? 'leaderboard-username current-user-score' : 'leaderboard-username';
        
        item.innerHTML = `
            <span class="${rankClass}">#${index + 1}</span>
            <span class="${userNameClass}">${displayName}${entry.isGuest ? ' (Guest)' : ''}</span>
            <span class="leaderboard-score">${entry.score}</span>
        `;
        
        if (isCurrentUser) {
            item.style.background = 'rgba(0, 212, 255, 0.2)';
            item.style.border = '1px solid var(--primary-color)';
        }
        
        list.appendChild(item);
    });
}

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
