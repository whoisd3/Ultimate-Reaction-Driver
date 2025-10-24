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
        this.gameState = 'loading';
        this.currentMode = 'classic';
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
        
        // Start render loop
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.xr.enabled = true;
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
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Point lights for atmosphere
        const pointLight1 = new THREE.PointLight(0x00d4ff, 2, 100);
        pointLight1.position.set(-30, 20, 0);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff006e, 2, 100);
        pointLight2.position.set(30, 20, 0);
        this.scene.add(pointLight2);
    }

    setupAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create oscillators for simple sound effects
            this.createSimpleSounds();
            
            // Background music with Web Audio API
            this.createBackgroundMusic();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    createSimpleSounds() {
        // Engine sound (will be modulated based on speed)
        this.sounds.engine = {
            oscillator: null,
            gainNode: null,
            playing: false
        };

        // Crash sound
        this.sounds.crash = () => {
            if (!this.audioContext) return;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.5);
        };

        // Pickup sound
        this.sounds.pickup = () => {
            if (!this.audioContext) return;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start();
            osc.stop(this.audioContext.currentTime + 0.2);
        };
    }

    createBackgroundMusic() {
        if (!this.audioContext) return;
        
        // Simple synthesized background music
        const createTone = (freq, duration, delay) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.05, this.audioContext.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + delay + duration);
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.start(this.audioContext.currentTime + delay);
            osc.stop(this.audioContext.currentTime + delay + duration);
        };

        // Play simple melody loop
        this.musicLoop = () => {
            if (this.gameState === 'playing') {
                const notes = [440, 494, 523, 587, 523, 494, 440, 392];
                notes.forEach((freq, i) => {
                    createTone(freq, 0.3, i * 0.4);
                });
            }
            setTimeout(() => this.musicLoop(), 3200);
        };
    }

    startEngineSound() {
        if (!this.audioContext || this.sounds.engine.playing) return;
        
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

        for (let i = 0; i < numSegments; i++) {
            const geometry = new THREE.PlaneGeometry(roadWidth, segmentLength);
            const material = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.8,
                metalness: 0.2
            });
            const segment = new THREE.Mesh(geometry, material);
            segment.rotation.x = -Math.PI / 2;
            segment.position.z = -i * segmentLength;
            segment.receiveShadow = true;
            this.scene.add(segment);
            this.roadSegments.push(segment);

            // Road markings
            const markingGeometry = new THREE.PlaneGeometry(1, 5);
            const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            
            for (let j = 0; j < 5; j++) {
                const marking = new THREE.Mesh(markingGeometry, markingMaterial);
                marking.rotation.x = -Math.PI / 2;
                marking.position.set(0, 0.1, -i * segmentLength - j * 10);
                segment.add(marking);
            }
        }

        // Side barriers
        const barrierGeometry = new THREE.BoxGeometry(2, 3, 500);
        const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        
        const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        leftBarrier.position.set(-roadWidth / 2 - 1, 1.5, -250);
        leftBarrier.castShadow = true;
        this.scene.add(leftBarrier);

        const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        rightBarrier.position.set(roadWidth / 2 + 1, 1.5, -250);
        rightBarrier.castShadow = true;
        this.scene.add(rightBarrier);
    }

    createPlayer() {
        const vehicleData = playerProgress.getCurrentVehicle();
        
        // Create vehicle body
        const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 5);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: vehicleData.color || 0x00d4ff,
            metalness: 0.7,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        
        // Create vehicle top
        const topGeometry = new THREE.BoxGeometry(2.5, 0.8, 3);
        const top = new THREE.Mesh(topGeometry, bodyMaterial);
        top.position.y = 1.15;
        top.castShadow = true;
        
        // Create wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const wheels = [];
        const wheelPositions = [
            [-1.2, -0.5, 1.5],
            [1.2, -0.5, 1.5],
            [-1.2, -0.5, -1.5],
            [1.2, -0.5, -1.5]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            wheels.push(wheel);
        });
        
        // Create player group
        this.player = new THREE.Group();
        this.player.add(body);
        this.player.add(top);
        wheels.forEach(wheel => this.player.add(wheel));
        
        this.player.position.set(0, 1, 20);
        this.player.userData.wheels = wheels;
        this.scene.add(this.player);
    }

    createObstacle() {
        const types = ['box', 'cone', 'barrier'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let geometry, material, obstacle;
        
        switch(type) {
            case 'box':
                geometry = new THREE.BoxGeometry(3, 3, 3);
                material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
                obstacle = new THREE.Mesh(geometry, material);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(1.5, 4, 8);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                obstacle = new THREE.Mesh(geometry, material);
                break;
            case 'barrier':
                geometry = new THREE.BoxGeometry(8, 2, 1);
                material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                obstacle = new THREE.Mesh(geometry, material);
                break;
        }
        
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        
        const lanes = [-10, 0, 10];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        obstacle.position.set(lane, type === 'cone' ? 2 : 1.5, -100);
        
        this.scene.add(obstacle);
        this.obstacles.push(obstacle);
    }

    createParticles(position, color) {
        const particleCount = 20;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.2, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: color || 0xffffff });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 3,
                (Math.random() - 0.5) * 2
            );
            particle.userData.life = 1.0;
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        this.particles.push(particles);
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

        // Touch
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        });

        canvas.addEventListener('touchend', (e) => {
            if (!e.changedTouches[0]) return;
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchEndX - this.touchStartX;
            
            if (this.gameState === 'playing') {
                if (diff > 50) this.moveRight();
                if (diff < -50) this.moveLeft();
            }
        });

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
            this.sounds.pickup();
        }
    }

    moveRight() {
        if (this.playerLane < 1) {
            this.playerLane++;
            this.sounds.pickup();
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

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showMainMenu() {
        this.gameState = 'menu';
        document.getElementById('main-menu').classList.remove('hidden');
        this.updateUI();
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
        
        // Clear obstacles
        this.obstacles.forEach(obs => this.scene.remove(obs));
        this.obstacles = [];
        
        // Reset player position
        this.player.position.set(0, 1, 20);
        
        // Show HUD
        this.hideMainMenu();
        document.getElementById('game-hud').classList.remove('hidden');
        
        // Hide/show timer based on mode
        if (mode === 'timeattack') {
            document.getElementById('hud-timer-container').style.display = 'flex';
        } else {
            document.getElementById('hud-timer-container').style.display = 'none';
        }
        
        // Start audio
        this.startEngineSound();
        if (this.musicLoop && this.audioContext) {
            this.musicLoop();
        }
    }

    pauseGame() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'paused';
        document.getElementById('pause-menu').classList.remove('hidden');
        this.stopEngineSound();
    }

    resumeGame() {
        this.gameState = 'playing';
        document.getElementById('pause-menu').classList.add('hidden');
        this.startEngineSound();
    }

    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('game-hud').classList.add('hidden');
        this.stopEngineSound();
        
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
        this.stopEngineSound();
    }

    updateGame(delta) {
        if (this.gameState !== 'playing') return;
        
        // Update time
        this.timeElapsed += delta;
        
        // Update speed based on mode and skills
        const speedBoost = 1 + (playerProgress.skills.speed * 0.1);
        this.speed = Math.min(this.baseSpeed * (1 + this.timeElapsed / 60) * speedBoost, this.maxSpeed);
        
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
        
        // Spawn obstacles
        this.obstacleSpawnTimer += delta;
        const spawnRate = Math.max(1.5 - (this.timeElapsed / 120), 0.5);
        
        if (this.obstacleSpawnTimer > spawnRate) {
            this.createObstacle();
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
            
            // Collision detection
            const distX = Math.abs(this.player.position.x - obstacle.position.x);
            const distZ = Math.abs(this.player.position.z - obstacle.position.z);
            
            if (distX < 3 && distZ < 4) {
                this.createParticles(obstacle.position, 0xff0000);
                this.gameOver();
                return;
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particleGroup = this.particles[i];
            let allDead = true;
            
            particleGroup.children.forEach(particle => {
                particle.userData.life -= delta * 0.5;
                if (particle.userData.life > 0) {
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(delta));
                    particle.userData.velocity.y -= 9.8 * delta;
                    particle.material.opacity = particle.userData.life;
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
        
        // Update engine sound
        this.updateEngineSound();
        
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
        document.getElementById('hud-score').textContent = Math.floor(this.score);
        document.getElementById('hud-speed').textContent = Math.floor(this.speed);
        document.getElementById('hud-distance').textContent = Math.floor(this.distance);
        
        const minutes = Math.floor(this.timeElapsed / 60);
        const seconds = Math.floor(this.timeElapsed % 60);
        document.getElementById('hud-timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateUI() {
        // Update player stats in menu
        document.getElementById('player-level').textContent = playerProgress.level;
        document.getElementById('player-xp').textContent = playerProgress.xp;
        document.getElementById('player-xp-needed').textContent = playerProgress.getXPForNextLevel();
        document.getElementById('skill-points').textContent = playerProgress.skillPoints;
        
        // Update XP bar
        const xpProgress = (playerProgress.xp / playerProgress.getXPForNextLevel()) * 100;
        document.getElementById('xp-progress').style.width = xpProgress + '%';
        
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
        
        const delta = 1 / 60; // Fixed timestep for consistency
        
        this.updateGame(delta);
        
        // Sync remote players in multiplayer
        if (this.connections.length > 0 && this.gameState === 'playing') {
            this.broadcastPlayerPosition();
        }
        
        this.renderer.render(this.scene, this.camera);
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
        
        this.roomId = roomId;
        document.getElementById('mp-status').textContent = 'Connecting...';
        
        // Simplified WebRTC connection
        try {
            this.peer = new SimplePeer({ initiator: true, trickle: false });
            
            this.peer.on('signal', data => {
                // In production, send this to signaling server
                console.log('Signal data:', data);
            });
            
            this.peer.on('connect', () => {
                document.getElementById('mp-status').textContent = 'Connected!';
                this.addPlayerTag('Player 2');
            });
            
            this.peer.on('data', data => {
                this.handleMultiplayerData(JSON.parse(data));
            });
            
            this.peer.on('error', err => {
                console.error('Peer error:', err);
                document.getElementById('mp-status').textContent = 'Connection failed';
            });
            
        } catch (error) {
            console.error('Multiplayer error:', error);
            alert('Multiplayer connection failed. SimplePeer library may not be available.');
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
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    save() {
        try {
            localStorage.setItem('ultimateReactionDriver', JSON.stringify(this));
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
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
        
        this.leaderboards[mode].push({
            score: score,
            date: new Date().toISOString()
        });
        
        // Keep only top 10
        this.leaderboards[mode].sort((a, b) => b.score - a.score);
        this.leaderboards[mode] = this.leaderboards[mode].slice(0, 10);
        
        this.save();
    }
}

// Global instances
const playerProgress = new PlayerProgress();
let game;

// UI Event Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game
    game = new GameEngine();
    
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
        item.innerHTML = `
            <span class="leaderboard-rank">#${index + 1}</span>
            <span>${new Date(entry.date).toLocaleDateString()}</span>
            <span class="leaderboard-score">${entry.score}</span>
        `;
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
