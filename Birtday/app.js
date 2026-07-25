const DOM = {
            container: document.getElementById('canvas-container'),
            loadingScreen: document.getElementById('loading-screen'),
            loadingBar: document.getElementById('loading-bar'),
            loadingPercent: document.getElementById('loading-percent'),
            hud: document.getElementById('hud'),
            scrollText: document.getElementById('scroll-text'),
            progressFill: document.getElementById('progress-fill'),
            frameOverlay: document.getElementById('frame-overlay'),
            frameClose: document.getElementById('frame-close'),
            flipCard: document.getElementById('flip-card'),
            flipHint: document.getElementById('flip-hint'),
            detailImage: document.getElementById('detail-image'),
            detailDate: document.getElementById('detail-date'),
            detailTitle: document.getElementById('detail-title'),
            detailDesc: document.getElementById('detail-desc'),
            noteDate: document.getElementById('note-date'),
            noteBody: document.getElementById('note-body'),
            introBanner: document.getElementById('intro-banner'),
            videoOverlay: document.getElementById('video-overlay'),
            videoPlayer: document.getElementById('video-player'),
            videoClose: document.getElementById('video-close'),
            videoTitle: document.getElementById('video-title'),
            finalReveal: document.getElementById('final-reveal'),
            exitBtn: document.getElementById('exit-btn'),
            restartBtn: document.getElementById('restart-btn'),
            cakeScreen: document.getElementById('cake-screen'),
            cakeStage: document.getElementById('cake-stage'),
            clothHint: document.getElementById('cloth-hint'),
            audioControl: document.getElementById('audio-control'),
            audioBtn: document.getElementById('audio-btn'),
            cursorRing: document.getElementById('cursor-ring'),
            cursorDot: document.getElementById('cursor-dot'),
        };

        // ================================================================
        //  SECTION 4: THREE.JS SCENE SETUP
        // ================================================================
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(CONFIG.fogColor, CONFIG.fogDensity);
        scene.background = new THREE.Color(CONFIG.fogColor);

        const camera = new THREE.PerspectiveCamera(
            CONFIG.cameraFOV,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        camera.position.set(0, CONFIG.cameraHeight, 5);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio, 1.75));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.outputEncoding = THREE.sRGBEncoding;
        DOM.container.appendChild(renderer.domElement);

        // ================================================================
        //  SECTION 5: PROCEDURAL TEXTURES
        // ================================================================

        /** Create a procedural wood plank texture */
        function createWoodTexture(width, height) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Base wood color
            ctx.fillStyle = '#7A583D';
            ctx.fillRect(0, 0, width, height);

            // Wood grain lines
            const grainCount = 60;
            for (let i = 0; i < grainCount; i++) {
                const y = (i / grainCount) * height;
                const alpha = 0.03 + Math.random() * 0.06;
                ctx.strokeStyle = `rgba(90, 63, 43, ${alpha})`;
                ctx.lineWidth = 0.5 + Math.random() * 1.5;
                ctx.beginPath();
                ctx.moveTo(0, y + Math.sin(i) * 3);
                for (let x = 0; x < width; x += 10) {
                    ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 4 + Math.random() * 1);
                }
                ctx.stroke();
            }

            // Plank lines (horizontal gaps)
            const plankWidth = width / 6;
            for (let x = plankWidth; x < width; x += plankWidth) {
                const offset = (Math.floor(x / plankWidth) % 2) ? plankWidth * 0.4 : 0;
                ctx.strokeStyle = 'rgba(50, 35, 20, 0.3)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x + offset, 0);
                ctx.lineTo(x + offset, height);
                ctx.stroke();
            }

            // Plank row separators
            const plankHeight = height / 30;
            for (let y = plankHeight; y < height; y += plankHeight) {
                ctx.strokeStyle = 'rgba(50, 35, 20, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Subtle color variation patches
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const r = 20 + Math.random() * 60;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
                const shade = Math.random() > 0.5 ? 'rgba(100, 75, 50, 0.04)' : 'rgba(60, 40, 25, 0.04)';
                gradient.addColorStop(0, shade);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.fillRect(x - r, y - r, r * 2, r * 2);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 20);
            return texture;
        }

        /** Create a wall texture with subtle variation */
        function createWallTexture(width, height) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#E7DDD0';
            ctx.fillRect(0, 0, width, height);

            // Subtle plaster texture
            for (let i = 0; i < 2000; i++) {
                const x = Math.random() * width;
                const y = Math.random() * height;
                const alpha = Math.random() * 0.03;
                const shade = Math.random() > 0.5 ? 255 : 200;
                ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
                ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 4);
            return texture;
        }

        // ================================================================
        //  SECTION 6: LIGHTING
        // ================================================================
        const ambientLight = new THREE.AmbientLight(0xFFF0E0, CONFIG.ambientIntensity);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xFFF5E1, 0x8B7355, 0.25);
        scene.add(hemiLight);

        // Ceiling lights along the hallway (recessed warm downlights)
        const ceilingLights = [];
        const ceilingLightSpacing = 16;
        for (let i = 0; i < CONFIG.hallwayLength / ceilingLightSpacing; i++) {
            const z = -i * ceilingLightSpacing;
            const light = new THREE.PointLight(0xFFE4C4, 0.5, 22, 2);
            light.position.set(0, CONFIG.hallwayHeight - 0.3, z);
            scene.add(light);
            ceilingLights.push(light);

            // Visible light fixture (small disc on ceiling)
            const fixtureGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.06, 16);
            const fixtureMat = new THREE.MeshStandardMaterial({
                color: 0xC6A15B,
                roughness: 0.3,
                metalness: 0.6,
                emissive: 0xFFF0D0,
                emissiveIntensity: 0.3
            });
            const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
            fixture.position.set(0, CONFIG.hallwayHeight - 0.03, z);
            scene.add(fixture);
        }

        // ================================================================
        //  SECTION 7: HALLWAY GEOMETRY
        // ================================================================
        const hallwayGroup = new THREE.Group();
        scene.add(hallwayGroup);

        const halfW = CONFIG.hallwayWidth / 2;
        const halfL = CONFIG.hallwayLength / 2;

        // ---- Floor with wood texture ----
        const floorTexture = createWoodTexture(1024, 1024);
        const floorGeo = new THREE.PlaneGeometry(CONFIG.hallwayWidth, CONFIG.hallwayLength);
        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.6,
            metalness: 0.15,
            color: 0x8A6844,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, -halfL + 5);
        floor.receiveShadow = true;
        hallwayGroup.add(floor);

        // ---- Floor reflection plane (subtle glossy look) ----
        const reflFloorGeo = new THREE.PlaneGeometry(CONFIG.hallwayWidth, CONFIG.hallwayLength);
        const reflFloorMat = new THREE.MeshStandardMaterial({
            color: 0x7A583D,
            roughness: 0.85,
            metalness: 0.05,
            transparent: true,
            opacity: 0.15,
        });
        const reflFloor = new THREE.Mesh(reflFloorGeo, reflFloorMat);
        reflFloor.rotation.x = -Math.PI / 2;
        reflFloor.position.set(0, 0.005, -halfL + 5);
        hallwayGroup.add(reflFloor);

        // ---- Barrel Vault Ceiling ----
        // Create a curved ceiling using a half-cylinder
        const ceilSegments = 32;
        const ceilLength = CONFIG.hallwayLength;
        const ceilRadius = CONFIG.hallwayWidth / 2;
        const ceilGeo = new THREE.CylinderGeometry(
            ceilRadius, ceilRadius, ceilLength, ceilSegments, 1, true,
            0, Math.PI
        );
        const wallTex = createWallTexture(512, 512);
        const ceilMat = new THREE.MeshStandardMaterial({
            map: wallTex,
            color: 0xE0D5C8,
            roughness: 0.95,
            metalness: 0.0,
            side: THREE.BackSide,
        });
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.rotation.z = Math.PI / 2;
        ceiling.position.set(0, CONFIG.hallwayHeight, -halfL + 5);
        hallwayGroup.add(ceiling);

        // ---- Walls ----
        const wallGeo = new THREE.PlaneGeometry(CONFIG.hallwayLength, CONFIG.hallwayHeight);
        const wallMatL = new THREE.MeshStandardMaterial({
            map: wallTex,
            color: 0xE7DDD0,
            roughness: 0.92,
            metalness: 0.0,
        });
        const wallMatR = wallMatL.clone();

        const leftWall = new THREE.Mesh(wallGeo, wallMatL);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-halfW, CONFIG.hallwayHeight / 2, -halfL + 5);
        leftWall.receiveShadow = true;
        hallwayGroup.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeo, wallMatR);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(halfW, CONFIG.hallwayHeight / 2, -halfL + 5);
        rightWall.receiveShadow = true;
        hallwayGroup.add(rightWall);

        // ---- Wainscoting (Dado Rail + Lower Panel) ----
        const dadoHeight = 1.2;
        const dadoGeo = new THREE.PlaneGeometry(CONFIG.hallwayLength, dadoHeight);
        const dadoMat = new THREE.MeshStandardMaterial({
            color: 0xD4C4B0,
            roughness: 0.85,
            metalness: 0.02,
        });

        // Left wainscoting
        const leftDado = new THREE.Mesh(dadoGeo, dadoMat);
        leftDado.rotation.y = Math.PI / 2;
        leftDado.position.set(-halfW + 0.01, dadoHeight / 2, -halfL + 5);
        hallwayGroup.add(leftDado);

        // Right wainscoting
        const rightDado = new THREE.Mesh(dadoGeo, dadoMat.clone());
        rightDado.rotation.y = -Math.PI / 2;
        rightDado.position.set(halfW - 0.01, dadoHeight / 2, -halfL + 5);
        hallwayGroup.add(rightDado);

        // ---- Dado Rail (horizontal trim at wainscoting top) ----
        const railGeo = new THREE.BoxGeometry(0.12, 0.08, CONFIG.hallwayLength);
        const railMat = new THREE.MeshStandardMaterial({
            color: 0x5A3F2B,
            roughness: 0.5,
            metalness: 0.15,
        });

        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-halfW + 0.06, dadoHeight, -halfL + 5);
        hallwayGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat.clone());
        rightRail.position.set(halfW - 0.06, dadoHeight, -halfL + 5);
        hallwayGroup.add(rightRail);

        // ---- Baseboards ----
        const baseGeo = new THREE.BoxGeometry(0.14, 0.35, CONFIG.hallwayLength);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x5A3F2B,
            roughness: 0.55,
            metalness: 0.1,
        });

        const leftBase = new THREE.Mesh(baseGeo, baseMat);
        leftBase.position.set(-halfW + 0.07, 0.175, -halfL + 5);
        hallwayGroup.add(leftBase);

        const rightBase = new THREE.Mesh(baseGeo, baseMat.clone());
        rightBase.position.set(halfW - 0.07, 0.175, -halfL + 5);
        hallwayGroup.add(rightBase);

        // ---- Crown Molding ----
        const crownGeo = new THREE.BoxGeometry(0.18, 0.25, CONFIG.hallwayLength);
        const crownMat = new THREE.MeshStandardMaterial({
            color: 0x5A3F2B,
            roughness: 0.5,
            metalness: 0.12,
        });

        const leftCrown = new THREE.Mesh(crownGeo, crownMat);
        leftCrown.position.set(-halfW + 0.09, CONFIG.hallwayHeight - 0.12, -halfL + 5);
        hallwayGroup.add(leftCrown);

        const rightCrown = new THREE.Mesh(crownGeo, crownMat.clone());
        rightCrown.position.set(halfW - 0.09, CONFIG.hallwayHeight - 0.12, -halfL + 5);
        hallwayGroup.add(rightCrown);

        // ---- Archways ----
        const archSpacing = 35;
        const archCount = Math.floor(CONFIG.hallwayLength / archSpacing);

        const sharedArchMats = {
            pillar: new THREE.MeshStandardMaterial({ color: 0xD4C4B0, roughness: 0.75, metalness: 0.05 }),
            accent: new THREE.MeshStandardMaterial({ color: 0xC6A15B, roughness: 0.35, metalness: 0.5 }),
            cap: new THREE.MeshStandardMaterial({ color: 0xC6A15B, roughness: 0.4, metalness: 0.4 })
        };

        function createArchway(z) {
            const group = new THREE.Group();
            const pillarW = 0.5;
            const pillarD = 0.5;

            // Left pillar
            const pGeo = new THREE.BoxGeometry(pillarW, CONFIG.hallwayHeight, pillarD);
            const lp = new THREE.Mesh(pGeo, sharedArchMats.pillar);
            lp.position.set(-halfW + pillarW / 2, CONFIG.hallwayHeight / 2, 0);
            lp.castShadow = true;
            group.add(lp);

            // Right pillar
            const rp = new THREE.Mesh(pGeo, sharedArchMats.pillar);
            rp.position.set(halfW - pillarW / 2, CONFIG.hallwayHeight / 2, 0);
            rp.castShadow = true;
            group.add(rp);

            // Arch lintel
            const lintelGeo = new THREE.BoxGeometry(CONFIG.hallwayWidth, 0.35, pillarD);
            const lintel = new THREE.Mesh(lintelGeo, sharedArchMats.pillar);
            lintel.position.set(0, CONFIG.hallwayHeight - 0.175, 0);
            group.add(lintel);

            // Gold accent strip on lintel
            const accentGeo = new THREE.BoxGeometry(CONFIG.hallwayWidth + 0.1, 0.06, pillarD + 0.05);
            const accent = new THREE.Mesh(accentGeo, sharedArchMats.accent);
            accent.position.set(0, CONFIG.hallwayHeight - 0.38, 0);
            group.add(accent);

            // Pillar capitals (small decorative tops)
            const capGeo = new THREE.BoxGeometry(pillarW + 0.15, 0.12, pillarD + 0.15);
            const leftCap = new THREE.Mesh(capGeo, sharedArchMats.cap);
            leftCap.position.set(-halfW + pillarW / 2, CONFIG.hallwayHeight - 0.42, 0);
            group.add(leftCap);

            const rightCap = new THREE.Mesh(capGeo, sharedArchMats.cap);
            rightCap.position.set(halfW - pillarW / 2, CONFIG.hallwayHeight - 0.42, 0);
            group.add(rightCap);

            group.position.z = z;
            hallwayGroup.add(group);
        }

        for (let i = 1; i <= archCount; i++) {
            createArchway(-i * archSpacing);
        }

        // ================================================================
        //  SECTION 8: DUST PARTICLES
        // ================================================================
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = new Float32Array(CONFIG.dustCount * 3);
        const dustSizes = new Float32Array(CONFIG.dustCount);
        const dustVelocities = [];

        for (let i = 0; i < CONFIG.dustCount; i++) {
            dustPos[i * 3] = (Math.random() - 0.5) * CONFIG.hallwayWidth * 0.85;
            dustPos[i * 3 + 1] = Math.random() * CONFIG.hallwayHeight;
            dustPos[i * 3 + 2] = -Math.random() * CONFIG.hallwayLength;
            dustSizes[i] = 0.02 + Math.random() * 0.04;
            dustVelocities.push({
                x: (Math.random() - 0.5) * 0.0015,
                y: (Math.random() - 0.5) * 0.0008 + 0.0004,
                z: (Math.random() - 0.5) * 0.0008,
            });
        }

        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

        const dustMat = new THREE.PointsMaterial({
            color: 0xF6E6A9,
            size: 0.035,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false,
        });

        const dustParticles = new THREE.Points(dustGeo, dustMat);
        scene.add(dustParticles);
        // ================================================================
        //  SECTION 9: MEMORY FRAMES (FIXED)
        // ================================================================
        const frames = [];
        const frameGroup = new THREE.Group();
        scene.add(frameGroup);

        const textureLoader = new THREE.TextureLoader();
        let loadedCount = 0;
        const totalToLoad = memories.length;

        // Shared materials for memory frames
        const sharedMats = {
            backing: new THREE.MeshStandardMaterial({ color: 0x2A1F15, roughness: 0.9, metalness: 0.0 }),
            mat: new THREE.MeshStandardMaterial({ color: 0xFDFBF8, roughness: 0.9, metalness: 0.0 }),
            border: {
                classic: new THREE.MeshStandardMaterial({
                    color: 0xC6A15B, roughness: 0.35, metalness: 0.6,
                    emissive: 0xC6A15B, emissiveIntensity: 0.12
                }),
                ornate: new THREE.MeshStandardMaterial({
                    color: 0xD4A94C, roughness: 0.25, metalness: 0.75,
                    emissive: 0xD4A94C, emissiveIntensity: 0.12
                }),
                modern: new THREE.MeshStandardMaterial({
                    color: 0x3A3530, roughness: 0.6, metalness: 0.3,
                    emissive: 0x3A3530, emissiveIntensity: 0.12
                })
            },
            innerOrnate: new THREE.MeshStandardMaterial({
                color: 0xB8963E, roughness: 0.4, metalness: 0.7,
                emissive: 0xB8963E, emissiveIntensity: 0.08
            })
        };

        function updateLoadingProgress() {
            loadedCount++;
            const pct = Math.min(100, Math.round((loadedCount / totalToLoad) * 100));
            DOM.loadingBar.style.width = pct + '%';
            DOM.loadingPercent.textContent = pct + '%';

            if (loadedCount >= totalToLoad) {
                setTimeout(() => {
                    DOM.loadingScreen.classList.add('hidden');
                    DOM.hud.classList.add('visible');
                    DOM.audioControl.classList.add('visible');
                }, 1000);
            }
        }

        function createPlaceholderTexture(title, date) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 640;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#3A3530';
            ctx.fillRect(0, 0, 512, 640);

            ctx.strokeStyle = '#C6A15B';
            ctx.lineWidth = 3;
            ctx.strokeRect(24, 24, 464, 592);

            ctx.strokeStyle = 'rgba(198, 161, 91, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(180, 420);
            ctx.lineTo(256, 300);
            ctx.lineTo(332, 420);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(360, 260, 30, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#FDFBF8';
            ctx.font = 'italic 28px serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, 256, 480);

            ctx.fillStyle = '#C6A15B';
            ctx.font = '12px sans-serif';
            ctx.fillText(date.toUpperCase(), 256, 520);

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            return texture;
        }

        function createMuseumLabel(title, date, frameW) {
            const canvas = document.createElement('canvas');
            const scale = 4; // Higher resolution for crisp text
            canvas.width = 400 * scale;
            canvas.height = 100 * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);

            ctx.fillStyle = '#F4EFE8';
            ctx.fillRect(0, 0, 400, 100);
            ctx.fillStyle = '#C6A15B';
            ctx.fillRect(0, 0, 400, 1.5);

            ctx.fillStyle = '#2F2A26';
            ctx.font = 'italic 300 62px "Cormorant Garamond", serif'; // Doubled font size
            ctx.textAlign = 'center';
            ctx.textWeight = 1000;
            ctx.fillText(title, 200, 45);

            ctx.fillStyle = '#8B6A45';
            ctx.font = '200 50px "Inter", sans-serif'; // Increased font size
            ctx.fillText(date, 200, 75);

            ctx.fillStyle = 'rgba(198, 161, 91, 0.3)';
            ctx.fillRect(50, 90, 300, 0.5);

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            return texture;
        }

        function createLightBeam(frameW, frameH) {
            const beamGeo = new THREE.ConeGeometry(
                Math.max(frameW, frameH) * 0.6,
                CONFIG.hallwayHeight - CONFIG.cameraHeight + 1,
                8, 1, true
            );
            const beamMat = new THREE.MeshBasicMaterial({
                color: 0xFFF5E1,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            return { mesh: beam, material: beamMat };
        }

        // Helper: only remote (http/https) images need CORS mode for use as a
        // WebGL texture. Local same-origin files (e.g. "assets/photo.jpg")
        // must NOT have crossOrigin set — otherwise Chrome/most browsers will
        // silently fail the load (fires the error callback, texture falls
        // back to the placeholder), even though the exact same file loads
        // fine in a plain <img> tag.
        function isRemoteUrl(src) {
            return /^https?:\/\//i.test(src);
        }

        function loadMemoryTexture(memory, onSuccess, onError) {
            textureLoader.crossOrigin = isRemoteUrl(memory.image) ? 'anonymous' : undefined;
            textureLoader.load(
                memory.image,
                onSuccess,
                undefined,
                (err) => {
                    // Fallback: some browsers (or file:// loading) can
                    // prevent TextureLoader from loading same-origin
                    // resources. Try loading via an HTMLImageElement and
                    // constructing a THREE.Texture from it.
                    const img = new Image();
                    if (isRemoteUrl(memory.image)) img.crossOrigin = 'anonymous';
                    img.onload = function () {
                        try {
                            const tex = new THREE.Texture(img);
                            tex.needsUpdate = true;
                            tex.minFilter = THREE.LinearFilter;
                            tex.magFilter = THREE.LinearFilter;
                            tex.encoding = THREE.sRGBEncoding;
                            onSuccess(tex);
                        } catch (e) {
                            onError(e || err);
                        }
                    };
                    img.onerror = function (e) {
                        onError(e || err);
                    };
                    img.src = memory.image;
                }
            );
        }

        // Build frames from memories data
        memories.forEach((memory, index) => {
            const z = CONFIG.frameStartZ - (index * CONFIG.frameSpacing);
            const isLeft = memory.side === 'left';
            const x = isLeft ? -halfW + 0.35 : halfW - 0.35;

            let frameW, frameH;
            // ==========================================
            // TO ADJUST PICTURE SIZES, CHANGE THESE VALUES
            // frameW = width, frameH = height
            // ==========================================
            switch (memory.size) {
                case 'portrait': frameW = 3.0; frameH = 4.0; break;
                case 'landscape': frameW = 4.8; frameH = 3.0; break;
                case 'square': frameW = 3.4; frameH = 3.4; break;
                default: frameW = 3.6; frameH = 3.2;
            }

            // To move the pictures higher or lower, you can change the '+ 0.8' offset here.
            // The Math.sin part creates a nice up-and-down wavy pattern along the hallway.
            const frameY = CONFIG.cameraHeight + 1 + (Math.sin(index * 1.7) * 0.6);
            const frameObj = new THREE.Group();
            frameObj.position.set(x, frameY, z);
            frameObj.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;

            let borderThickness = 0.14; // slightly thicker for visibility
            let borderStyle = 'classic';
            if (memory.frameStyle === 'ornate') {
                borderThickness = 0.22;
                borderStyle = 'ornate';
            } else if (memory.frameStyle === 'modern') {
                borderThickness = 0.08;
                borderStyle = 'modern';
            }

            // ---- Dark backing plate (makes frame visible against wall) ----
            const backingGeo = new THREE.BoxGeometry(
                frameW + borderThickness * 2 + 0.3,
                frameH + borderThickness * 2 + 0.3,
                0.04
            );
            const backing = new THREE.Mesh(backingGeo, sharedMats.backing);
            backing.position.z = -0.06;
            backing.receiveShadow = true;
            frameObj.add(backing);

            // ---- Gold frame border (with emissive glow so it's never invisible) ----
            const borderGeo = new THREE.BoxGeometry(
                frameW + borderThickness * 2,
                frameH + borderThickness * 2,
                0.1
            );
            const border = new THREE.Mesh(borderGeo, sharedMats.border[borderStyle]);
            border.castShadow = true;
            frameObj.add(border);

            if (memory.frameStyle === 'ornate') {
                const innerBorderGeo = new THREE.BoxGeometry(
                    frameW + borderThickness,
                    frameH + borderThickness,
                    0.11
                );
                const innerBorder = new THREE.Mesh(innerBorderGeo, sharedMats.innerOrnate);
                frameObj.add(innerBorder);
            }

            // ---- Mat (white border inside frame) ----
            const matPadding = 0.08;
            const matGeo = new THREE.PlaneGeometry(
                frameW - matPadding,
                frameH - matPadding
            );
            const mat = new THREE.Mesh(matGeo, sharedMats.mat);
            mat.position.z = 0.055;
            frameObj.add(mat);

            // ---- Photo plane ----
            const photoPadding = 0.15;
            const photoGeo = new THREE.PlaneGeometry(
                frameW - photoPadding * 2,
                frameH - photoPadding * 2
            );
            const photoMat = new THREE.MeshStandardMaterial({
                map: createPlaceholderTexture(memory.title, memory.date),
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.0,
                side: THREE.DoubleSide,
            });
            const photo = new THREE.Mesh(photoGeo, photoMat);
            photo.position.z = 0.058;
            frameObj.add(photo);

            // ---- Video play button overlay ----
            let hasVideo = !!(memory.video);
            if (hasVideo) {
                const playBtnGeo = new THREE.PlaneGeometry(0.5, 0.5);
                const playBtnCanvas = document.createElement('canvas');
                playBtnCanvas.width = 128;
                playBtnCanvas.height = 128;
                const pCtx = playBtnCanvas.getContext('2d');
                pCtx.fillStyle = 'rgba(0,0,0,0.5)';
                pCtx.beginPath();
                pCtx.arc(64, 64, 50, 0, Math.PI * 2);
                pCtx.fill();
                pCtx.fillStyle = '#FDFBF8';
                pCtx.beginPath();
                pCtx.moveTo(50, 35);
                pCtx.lineTo(50, 93);
                pCtx.lineTo(90, 64);
                pCtx.closePath();
                pCtx.fill();
                const playTex = new THREE.CanvasTexture(playBtnCanvas);
                const playMat = new THREE.MeshBasicMaterial({
                    map: playTex,
                    transparent: true,
                    depthWrite: false,
                });
                const playBtn = new THREE.Mesh(playBtnGeo, playMat);
                playBtn.position.z = 0.065;
                frameObj.add(playBtn);
            }

            // ---- Load texture ----
            loadMemoryTexture(
                memory,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.encoding = THREE.sRGBEncoding;
                    photoMat.map = texture;
                    photoMat.needsUpdate = true;
                    updateLoadingProgress();
                },
                (err) => {
                    updateLoadingProgress();
                }
            );

            // ---- Museum label ----
            const labelW = 2.1; // Increased size for better visibility with large frames
            const labelGeo = new THREE.PlaneGeometry(labelW, 0.525);
            const labelTexture = createMuseumLabel(memory.title, memory.date, frameW);
            const labelMat = new THREE.MeshBasicMaterial({
                map: labelTexture,
                transparent: true,
            });
            const label = new THREE.Mesh(labelGeo, labelMat);
            // Moved further down and slightly forward so it doesn't clip into the frame backing
            label.position.set(0, -frameH / 2 - 0.7, 0.1);
            frameObj.add(label);

            // ---- Warm ambient light in front of frame (always on, low) ----
            const frameAmbientLight = new THREE.PointLight(0xFFE4C4, 0.25, 10, 2);
            frameAmbientLight.position.set(0, 0, 1.2);
            frameObj.add(frameAmbientLight);

            // ---- Spotlight for hover/approach ----
            const spotLight = new THREE.SpotLight(CONFIG.spotlightColor, 0, 18, Math.PI / 6, 0.6, 2);
            spotLight.position.set(0, CONFIG.hallwayHeight - frameY + 1.5, 1.5);
            spotLight.target = border;
            spotLight.castShadow = false;
            spotLight.shadow.mapSize.width = CONFIG.shadowMapSize;
            spotLight.shadow.mapSize.height = CONFIG.shadowMapSize;
            frameObj.add(spotLight);

            // ---- Volumetric beam ----
            const beam = createLightBeam(frameW, frameH);
            beam.mesh.position.set(0, (CONFIG.hallwayHeight - frameY) / 2 + 0.5, 0.8);
            beam.mesh.rotation.x = Math.PI * 0.05;
            frameObj.add(beam.mesh);

            frames.push({
                mesh: frameObj,
                photo: photo,
                border: border,
                spotlight: spotLight,
                beam: beam,
                data: memory,
                worldZ: z,
                hovered: false,
                hasVideo: hasVideo,
            });

            frameGroup.add(frameObj);
        });
        // ================================================================
        //  SECTION 10: FINAL FRAME (The Birthday Surprise)
        // ================================================================
        const finalZ = -CONFIG.hallwayLength + 18;
        const finalFrameGroup = new THREE.Group();
        finalFrameGroup.position.set(0, CONFIG.cameraHeight + 0.3, finalZ);

        // Large ornate gold frame
        const finalFrameW = 4.5;
        const finalFrameH = 3.5;

        const finalBorderGeo = new THREE.BoxGeometry(finalFrameW + 0.4, finalFrameH + 0.4, 0.16);
        const finalBorderMat = new THREE.MeshStandardMaterial({
            color: 0xD4A94C,
            roughness: 0.2,
            metalness: 0.8,
        });
        const finalBorder = new THREE.Mesh(finalBorderGeo, finalBorderMat);
        finalFrameGroup.add(finalBorder);

        // Inner border
        const finalInnerGeo = new THREE.BoxGeometry(finalFrameW + 0.15, finalFrameH + 0.15, 0.17);
        const finalInnerMat = new THREE.MeshStandardMaterial({
            color: 0xB8963E,
            roughness: 0.3,
            metalness: 0.7,
        });
        const finalInner = new THREE.Mesh(finalInnerGeo, finalInnerMat);
        finalFrameGroup.add(finalInner);

        // Birthday message canvas (hidden behind cloth)
        const birthdayCanvas = document.createElement('canvas');
        birthdayCanvas.width = 1024;
        birthdayCanvas.height = 800;
        const bCtx = birthdayCanvas.getContext('2d');

        // Rich dark background
        bCtx.fillStyle = '#1A1612';
        bCtx.fillRect(0, 0, 1024, 800);

        // Subtle radial glow
        const glowGrad = bCtx.createRadialGradient(512, 400, 0, 512, 400, 450);
        glowGrad.addColorStop(0, 'rgba(198, 161, 91, 0.08)');
        glowGrad.addColorStop(1, 'transparent');
        bCtx.fillStyle = glowGrad;
        bCtx.fillRect(0, 0, 1024, 800);

        // "Happy Birthday" text
        bCtx.textAlign = 'center';
        bCtx.fillStyle = '#FDFBF8';
        bCtx.font = '300 72px "Cormorant Garamond", serif';
        bCtx.fillText('Happy Birthday', 512, 360);

        // Heart
        bCtx.fillStyle = '#C6A15B';
        bCtx.font = '48px serif';
        bCtx.fillText('❤', 512, 440);

        // Subtitle
        bCtx.fillStyle = 'rgba(198, 161, 91, 0.5)';
        bCtx.font = '200 22px "Inter", sans-serif';
        bCtx.fillText('To the love of my life', 512, 520);

        const birthdayTexture = new THREE.CanvasTexture(birthdayCanvas);
        const birthdayGeo = new THREE.PlaneGeometry(finalFrameW - 0.3, finalFrameH - 0.3);
        const birthdayMat = new THREE.MeshBasicMaterial({
            map: birthdayTexture,
            transparent: false,
        });
        const birthdayMesh = new THREE.Mesh(birthdayGeo, birthdayMat);
        birthdayMesh.position.z = 0.09; // Fixed z-fighting with inner border
        finalFrameGroup.add(birthdayMesh);

        // White cloth covering the frame
        const clothSegW = 20;
        const clothSegH = 16;
        const clothGeo = new THREE.PlaneGeometry(finalFrameW, finalFrameH, clothSegW, clothSegH);
        const clothMat = new THREE.MeshStandardMaterial({
            color: 0xFDFBF8,
            roughness: 0.85,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
        });

        // Add subtle cloth folds by displacing vertices
        const clothVerts = clothGeo.attributes.position;
        for (let i = 0; i < clothVerts.count; i++) {
            const x = clothVerts.getX(i);
            const y = clothVerts.getY(i);
            clothVerts.setZ(i, Math.sin(x * 3) * 0.03 + Math.sin(y * 4) * 0.02);
        }
        clothGeo.computeVertexNormals();

        const cloth = new THREE.Mesh(clothGeo, clothMat);
        cloth.position.z = 0.12;
        finalFrameGroup.add(cloth);

        // Dramatic spotlight for final frame
        const finalSpot = new THREE.SpotLight(0xFFF5E1, 2.5, 25, Math.PI / 5, 0.3, 1.5);
        finalSpot.position.set(0, 8, finalZ + 5);
        finalSpot.target.position.set(0, CONFIG.cameraHeight, finalZ);
        finalSpot.castShadow = true;
        scene.add(finalSpot);
        scene.add(finalSpot.target);

        scene.add(finalFrameGroup);

        // ---- Star Field (for final reveal) ----
        const starGeo = new THREE.BufferGeometry();
        const starCount = 4000;
        const starPositions = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            starPositions[i * 3] = (Math.random() - 0.5) * 250;
            starPositions[i * 3 + 1] = Math.random() * 60 + 3;
            starPositions[i * 3 + 2] = finalZ - 15 - Math.random() * 60;
            starSizes[i] = 0.05 + Math.random() * 0.2;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.12,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false,
        });
        const stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        // ================================================================
        //  SECTION 11: SCROLL / MOVEMENT SYSTEM
        // ================================================================
        let targetZ = 5;
        let currentZ = 5;
        let scrollVelocity = 0;
        let isWalking = false;
        let isFinalReveal = false;
        let finalRevealed = false;
        let nearFinal = false;
        let hoverRayFrame = 0;

        // Mouse wheel
        window.addEventListener('wheel', (e) => {
            if (isFinalReveal) return;
            scrollVelocity += e.deltaY * CONFIG.scrollSensitivity;
            scrollVelocity = Math.max(-2, Math.min(2, scrollVelocity));
            isWalking = true;

            // Fade out guidance after first movement
            DOM.scrollText.style.opacity = '0';
            DOM.introBanner?.classList.add('hidden');
        }, { passive: true });

        // Touch support
        let touchStartY = 0;
        let touchActive = false;

        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchActive = true;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isFinalReveal || !touchActive) return;
            const deltaY = touchStartY - e.touches[0].clientY;
            scrollVelocity += deltaY * 0.008;
            scrollVelocity = Math.max(-1.5, Math.min(1.5, scrollVelocity));
            touchStartY = e.touches[0].clientY;
            isWalking = true;
            DOM.introBanner?.classList.add('hidden');
        }, { passive: true });

        window.addEventListener('touchend', () => {
            touchActive = false;
        }, { passive: true });

        // ================================================================
        //  SECTION 12: RAYCASTING & INTERACTIONS
        // ================================================================
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(-100, -100);
        let hoveredFrame = null;
        let selectedFrame = null;
        let cursorX = 0, cursorY = 0;

        // Mouse movement — custom cursor + raycasting coords
        window.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            cursorX = e.clientX;
            cursorY = e.clientY;

            // Smooth cursor follow
            DOM.cursorRing.style.left = e.clientX + 'px';
            DOM.cursorRing.style.top = e.clientY + 'px';
            DOM.cursorDot.style.left = e.clientX + 'px';
            DOM.cursorDot.style.top = e.clientY + 'px';
        });

        // Click handling
        window.addEventListener('click', (e) => {
            if (isFinalReveal) return;

            // Frame overlay is open — check for close or flip
            if (selectedFrame) return;

            // Check if hovering a frame
            if (hoveredFrame) {
                if (hoveredFrame.hasVideo && hoveredFrame.data.video) {
                    openVideoPlayer(hoveredFrame);
                } else {
                    openFrameDetail(hoveredFrame);
                }
                return;
            }

            // Check final cloth click
            if (nearFinal && !finalRevealed) {
                raycaster.setFromCamera(mouse, camera);
                const hits = raycaster.intersectObject(cloth);
                if (hits.length > 0) {
                    triggerFinalReveal();
                }
            }
        });

        // ---- Frame Detail Overlay ----
        function openFrameDetail(frame) {
            selectedFrame = frame;
            const d = frame.data;

            // Set image
            DOM.detailImage.src = d.image;

            // Set info
            DOM.detailDate.textContent = d.date;
            DOM.detailTitle.textContent = d.title;
            DOM.detailDesc.textContent = d.description || '';

            // Set note for back of card
            DOM.noteDate.textContent = d.date;
            DOM.noteBody.textContent = d.note || 'A moment I will never forget.';

            // Reset flip state
            DOM.flipCard.classList.remove('flipped');

            // Show overlay
            DOM.frameOverlay.classList.add('active');

            // Auto-size flip card based on image aspect
            const img = new Image();
            img.onload = function () {
                const aspect = img.naturalWidth / img.naturalHeight;
                let cardW, cardH;
                if (aspect > 1.3) { // landscape
                    cardW = Math.min(480, window.innerWidth * 0.5);
                    cardH = cardW / aspect;
                } else if (aspect < 0.8) { // portrait
                    cardH = Math.min(500, window.innerHeight * 0.55);
                    cardW = cardH * aspect;
                } else { // square-ish
                    cardW = Math.min(400, window.innerWidth * 0.45);
                    cardH = cardW / aspect;
                }
                DOM.flipCard.style.width = cardW + 'px';
                DOM.flipCard.style.height = cardH + 'px';
            };
            img.src = d.image;

            // Dim lights
            gsap.to(ambientLight, { intensity: 0.08, duration: 1.2 });
            gsap.to(hemiLight, { intensity: 0.03, duration: 1.2 });
        }

        function closeFrameDetail() {
            selectedFrame = null;
            DOM.frameOverlay.classList.remove('active');
            DOM.flipCard.classList.remove('flipped');

            // Restore lights
            gsap.to(ambientLight, { intensity: CONFIG.ambientIntensity, duration: 1 });
            gsap.to(hemiLight, { intensity: 0.25, duration: 1 });
        }

        // Flip card click
        DOM.flipHint.addEventListener('click', () => {
            DOM.flipCard.classList.toggle('flipped');
        });

        DOM.flipCard.addEventListener('click', (e) => {
            // Only flip if clicking the card itself, not overlay controls
            if (e.target === DOM.flipCard || DOM.flipCard.contains(e.target)) {
                DOM.flipCard.classList.toggle('flipped');
            }
        });

        // Close button
        DOM.frameClose.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFrameDetail();
        });

        // Click overlay background to close
        DOM.frameOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.frameOverlay) closeFrameDetail();
        });

        // ---- Video Player ----
        function openVideoPlayer(frame) {
            const d = frame.data;
            DOM.videoPlayer.src = d.video;
            DOM.videoTitle.textContent = d.title;
            DOM.videoOverlay.classList.add('active');

            // Dim lights
            gsap.to(ambientLight, { intensity: 0.05, duration: 1 });
            gsap.to(hemiLight, { intensity: 0.02, duration: 1 });
        }

        function closeVideoPlayer() {
            DOM.videoOverlay.classList.remove('active');
            DOM.videoPlayer.pause();
            DOM.videoPlayer.src = '';

            // Restore lights
            gsap.to(ambientLight, { intensity: CONFIG.ambientIntensity, duration: 1 });
            gsap.to(hemiLight, { intensity: 0.25, duration: 1 });
        }

        DOM.videoClose.addEventListener('click', (e) => {
            e.stopPropagation();
            closeVideoPlayer();
        });

        DOM.videoOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.videoOverlay) closeVideoPlayer();
        });

        // ================================================================
        //  SECTION 13: FINAL REVEAL SEQUENCE
        // ================================================================
        function triggerFinalReveal() {
            if (finalRevealed) return;
            finalRevealed = true;
            isFinalReveal = true;

            DOM.clothHint.classList.remove('visible');

            // Timeline for the reveal
            const tl = gsap.timeline();

            // 1. Cloth ripples then falls
            tl.to(cloth.position, {
                y: -finalFrameH * 0.8,
                z: 0.5,
                duration: 2.5,
                ease: 'power2.inOut'
            })
                .to(cloth.rotation, {
                    x: Math.PI / 3,
                    duration: 2.5,
                    ease: 'power2.inOut'
                }, '<')
                .to(clothMat, {
                    opacity: 0,
                    duration: 1.5,
                    delay: 0.5,
                    ease: 'power2.out'
                }, '<+1');

            // 2. Pause to let them see "Happy Birthday"
            tl.to({}, { duration: 3 });

            // 3. Walls slowly open
            tl.to(leftWall.position, {
                x: -CONFIG.hallwayWidth * 1.2,
                duration: 4,
                ease: 'power2.inOut'
            })
                .to(rightWall.position, {
                    x: CONFIG.hallwayWidth * 1.2,
                    duration: 4,
                    ease: 'power2.inOut'
                }, '<')
                .to(leftBase.position, {
                    x: -CONFIG.hallwayWidth * 1.2,
                    duration: 4,
                    ease: 'power2.inOut'
                }, '<')
                .to(rightBase.position, {
                    x: CONFIG.hallwayWidth * 1.2,
                    duration: 4,
                    ease: 'power2.inOut'
                }, '<')
                .to(leftDado.position, {
                    x: -CONFIG.hallwayWidth * 1.2,
                    duration: 4,
                    ease: 'power2.inOut'
                }, '<')
                .to(rightDado.position, {
                    x: CONFIG.hallwayWidth * 1.2,
                    duration: 4,
                    ease: 'power2.inOut'
                }, '<');

            // 4. Stars appear, fog clears
            tl.to(starMat, {
                opacity: 0.9,
                duration: 4,
            }, '<+1')
                .to(scene.fog, {
                    density: 0.003,
                    duration: 4,
                }, '<');

            // 5. Golden light flood
            tl.to(ambientLight, {
                intensity: 0.6,
                duration: 3,
            }, '<')
                .to(ambientLight.color, {
                    r: 1.0, g: 0.9, b: 0.7,
                    duration: 3,
                }, '<');

            // 6. Camera slowly moves forward through opening
            tl.to(camera.position, {
                z: finalZ - 12,
                duration: 6,
                ease: 'power1.inOut',
                onUpdate: () => {
                    currentZ = camera.position.z;
                    targetZ = currentZ;
                }
            }, '<-1');

            // 7. Final text reveal
            tl.call(() => {
                DOM.finalReveal.classList.add('active');
                DOM.finalReveal.style.pointerEvents = 'none';

                const lines = document.querySelectorAll('.reveal-line');
                lines.forEach((line, i) => {
                    gsap.to(line, {
                        opacity: 1,
                        y: 0,
                        duration: 2.5,
                        delay: i * 2,
                        ease: 'power2.out',
                        onStart: () => {
                            line.style.transform = `translateY(30px)`;
                        }
                    });
                });
            }, null, null, '<+2');
        }

        // ================================================================
        //  SECTION 14: AUDIO SYSTEM
        // ================================================================
        let audioTrack = null;
        let isAudioPlaying = false;
        let hasSkippedIntro = false;

        function buildCakeScene() {
            if (!DOM.cakeStage || DOM.cakeStage.querySelector('.cake-svg')) return;

            const sceneEl = document.createElement('div');
            sceneEl.className = 'cake-scene';
            sceneEl.innerHTML = `
                <svg class="cake-svg" viewBox="0 0 440 440" aria-label="Birthday cake">
                    <circle cx="220" cy="220" r="182" fill="rgba(255,246,232,0.06)" />
                    <ellipse cx="220" cy="306" rx="120" ry="26" fill="rgba(5,4,12,0.35)" />
                    <rect x="114" y="180" width="212" height="118" rx="22" fill="#f2a6a6" />
                    <rect x="104" y="150" width="232" height="90" rx="20" fill="#ffffff" />
                    <rect x="120" y="118" width="200" height="70" rx="18" fill="#f4c77c" />
                    <rect x="98" y="92" width="244" height="58" rx="16" fill="#e8a94d" />
                    <path d="M126 152c18-26 44-42 94-42 52 0 79 16 100 42" fill="none" stroke="#fff6e8" stroke-width="8" stroke-linecap="round" />
                    <path d="M138 194h164" stroke="#fff6e8" stroke-width="8" stroke-linecap="round" />
                    <path d="M142 220h156" stroke="#fff6e8" stroke-width="8" stroke-linecap="round" />
                    <path d="M144 246h152" stroke="#fff6e8" stroke-width="8" stroke-linecap="round" />
                    <rect x="194" y="86" width="52" height="70" rx="10" fill="#fff6e8" />
                    <rect x="204" y="78" width="32" height="18" rx="6" fill="#f2a6a6" />
                    <circle class="cake-flame" cx="220" cy="70" r="12" fill="#f4c77c" />
                    <circle cx="220" cy="70" r="6" fill="#fff6e8" opacity="0.95" />
                    <circle class="cake-sparkle" cx="106" cy="146" r="6" fill="#fff6e8" />
                    <circle class="cake-sparkle" cx="334" cy="146" r="6" fill="#f2a6a6" />
                    <circle class="cake-sparkle" cx="162" cy="116" r="5" fill="#6fcfc0" />
                    <circle class="cake-sparkle" cx="278" cy="116" r="5" fill="#eedff5" />
                </svg>`;

            DOM.cakeStage.appendChild(sceneEl);
        }

        function startBirthdayCelebration() {
            DOM.finalReveal?.classList.remove('active');
            DOM.cakeScreen?.classList.add('active');
            DOM.cakeScreen?.setAttribute('aria-hidden', 'false');
            document.body.classList.add('celebrating');

            buildCakeScene();
            const sceneEl = DOM.cakeStage?.querySelector('.cake-scene');
            const svg = DOM.cakeStage?.querySelector('.cake-svg');
            const flame = svg?.querySelector('.cake-flame');
            const sparkles = Array.from(DOM.cakeStage?.querySelectorAll('.cake-sparkle') || []);

            if (!sceneEl) return;

            gsap.killTweensOf([sceneEl, svg, flame, ...sparkles]);
            gsap.set(sceneEl, { opacity: 0, scale: 0.9, y: 24 });
            gsap.set(svg, { rotation: 0 });
            sparkles.forEach((sparkle, index) => {
                gsap.set(sparkle, { opacity: 0, scale: 0.4 });
                gsap.to(sparkle, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.7,
                    delay: 0.08 * index,
                    ease: 'back.out(1.7)'
                });
            });

            gsap.to(sceneEl, {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 1.15,
                ease: 'power2.out'
            });

            if (flame) {
                gsap.to(flame, {
                    scale: 1.08,
                    yoyo: true,
                    repeat: -1,
                    duration: 0.8,
                    ease: 'sine.inOut'
                });
            }
        }

        DOM.exitBtn.addEventListener('click', () => {
            startBirthdayCelebration();
        });

        DOM.restartBtn?.addEventListener('click', () => {
            window.location.reload();
        });

        window.startBirthdayCelebration = startBirthdayCelebration;

        DOM.audioBtn.addEventListener('click', () => {
            if (!audioTrack) initAudio();

            if (isAudioPlaying) {
                audioTrack.pause();
                isAudioPlaying = false;
                DOM.audioBtn.classList.remove('playing');
                const textNode = DOM.audioBtn.lastChild;
                if (textNode.nodeType === 3) textNode.textContent = ' Play Our Song';
            } else {
                audioTrack.play();
                isAudioPlaying = true;
                DOM.audioBtn.classList.add('playing');
                const textNode = DOM.audioBtn.lastChild;
                if (textNode.nodeType === 3) textNode.textContent = ' Playing';
            }
        });

        function initAudio() {
            audioTrack = new Audio('./assets/Ikaw Lang.mp3');
            audioTrack.loop = true;
            audioTrack.volume = 0.6;
            audioTrack.preload = 'auto';
            audioTrack.addEventListener('loadedmetadata', () => {
                if (!hasSkippedIntro && audioTrack.duration > 5) {
                    try {
                        audioTrack.currentTime = 5;
                        hasSkippedIntro = true;
                    } catch (error) {
                        // Some browsers may not allow setting currentTime until playback starts.
                    }
                }
            });
            audioTrack.addEventListener('play', () => {
                if (!hasSkippedIntro && audioTrack.duration > 5) {
                    try {
                        audioTrack.currentTime = 5;
                        hasSkippedIntro = true;
                    } catch (error) {
                        // ignore if seeking is not allowed yet
                    }
                }
            });
            audioTrack.addEventListener('ended', () => {
                isAudioPlaying = false;
                DOM.audioBtn.classList.remove('playing');
                const textNode = DOM.audioBtn.lastChild;
                if (textNode.nodeType === 3) textNode.textContent = ' Play Our Song';
            });
        }

        // ================================================================
        //  SECTION 15: ANIMATION LOOP
        // ================================================================
        const clock = new THREE.Clock();
        let time = 0;
        const borderMeshes = frames.map(f => f.border);

        function animate() {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            time += delta;
            const w = window.innerWidth;
            const h = window.innerHeight;

            // ---- Camera movement with inertia ----
            if (!isFinalReveal) {
                scrollVelocity *= CONFIG.friction;
                if (Math.abs(scrollVelocity) < 0.0001) {
                    scrollVelocity = 0;
                    isWalking = false;
                }

                targetZ -= scrollVelocity;
                targetZ = Math.max(-CONFIG.hallwayLength + 22, Math.min(5, targetZ));

                currentZ += (targetZ - currentZ) * CONFIG.interpolation;
                camera.position.z = currentZ;
            }

            // ---- Subtle breathing / head bob ----
            const breathe = Math.sin(time * 0.7) * 0.015;
            const headBob = isWalking ? Math.sin(time * 3.2) * 0.008 : 0;
            camera.position.y = CONFIG.cameraHeight + breathe + headBob;

            // Gentle lateral sway
            camera.position.x = Math.sin(time * 0.4) * 0.02;

            // Micro camera rotation
            camera.rotation.z = Math.sin(time * 0.25) * 0.001;
            camera.rotation.x = Math.sin(time * 0.6) * 0.0008;

            // ---- Dust particles ----
            const positions = dustGeo.attributes.position.array;
            const dustCount = CONFIG.dustCount;
            for (let i = 0, pi = 0; i < dustCount; i++, pi += 3) {
                positions[pi] += dustVelocities[i].x;
                positions[pi + 1] += dustVelocities[i].y;
                positions[pi + 2] += dustVelocities[i].z;

                if (positions[pi + 1] > CONFIG.hallwayHeight) {
                    positions[pi + 1] = 0;
                }
                if (Math.abs(positions[pi]) > halfW) {
                    dustVelocities[i].x *= -1;
                }
            }
            dustGeo.attributes.position.needsUpdate = true;

            // ---- Frame proximity interactions (approach-based lighting) ----
            if (!selectedFrame && !isFinalReveal) {
                let intersects = [];
                if (++hoverRayFrame >= 4) {
                    hoverRayFrame = 0;
                    raycaster.setFromCamera(mouse, camera);
                    intersects = raycaster.intersectObjects(borderMeshes);
                }

                // Handle hover
                if (intersects.length > 0) {
                    let hitFrame = null;
                    for (let i = 0; i < frames.length; i++) {
                        if (frames[i].border === intersects[0].object) {
                            hitFrame = frames[i];
                            break;
                        }
                    }
                    if (hitFrame && hitFrame !== hoveredFrame) {
                        if (hoveredFrame) {
                            gsap.to(hoveredFrame.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
                            gsap.to(hoveredFrame.spotlight, { intensity: 0, duration: 0.6 });
                            gsap.to(hoveredFrame.beam.material, { opacity: 0, duration: 0.6 });
                        }
                        hoveredFrame = hitFrame;
                        DOM.cursorRing.classList.add('hovering');
                        gsap.to(hoveredFrame.mesh.scale, {
                            x: 1.06, y: 1.06, z: 1.06,
                            duration: 0.6,
                            ease: 'power2.out'
                        });
                        gsap.to(hoveredFrame.spotlight, {
                            intensity: CONFIG.spotlightIntensity,
                            duration: 0.6
                        });
                        gsap.to(hoveredFrame.beam.material, {
                            opacity: 0.04,
                            duration: 0.8
                        });
                    }
                } else if (hoveredFrame) {
                    gsap.to(hoveredFrame.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
                    gsap.to(hoveredFrame.spotlight, { intensity: 0, duration: 0.6 });
                    gsap.to(hoveredFrame.beam.material, { opacity: 0, duration: 0.6 });
                    hoveredFrame = null;
                    DOM.cursorRing.classList.remove('hovering');
                }

                // Distance-based ambient spotlight for nearby frames
                for (let i = 0; i < frames.length; i++) {
                    const frame = frames[i];
                    const dist = Math.abs(currentZ - frame.worldZ);
                    if (dist < CONFIG.approachDistance && frame !== hoveredFrame) {
                        const proximity = 1 - (dist / CONFIG.approachDistance);
                        const targetIntensity = proximity * 0.4;
                        frame.spotlight.intensity += (targetIntensity - frame.spotlight.intensity) * 0.05;
                        frame.beam.material.opacity += (proximity * 0.015 - frame.beam.material.opacity) * 0.05;
                    } else if (frame !== hoveredFrame) {
                        frame.spotlight.intensity *= 0.95;
                        frame.beam.material.opacity *= 0.95;
                    }
                }
            }

            // ---- Check approach to final frame ----
            if (currentZ < finalZ + 25 && !nearFinal && !finalRevealed) {
                nearFinal = true;
                DOM.clothHint.classList.add('visible');
                DOM.scrollText.style.opacity = '0';
            }
            if (currentZ > finalZ + 25 && nearFinal && !finalRevealed) {
                nearFinal = false;
                DOM.clothHint.classList.remove('visible');
            }

            // ---- Update progress ----
            const progress = Math.max(0, Math.min(100,
                (5 - currentZ) / (CONFIG.hallwayLength - 25) * 100
            ));
            DOM.progressFill.style.height = progress + '%';

            // ---- Star twinkle ----
            if (isFinalReveal) {
                starMat.opacity = Math.min(1, starMat.opacity);
            }

            // ---- Render ----
            renderer.render(scene, camera);
        }

        // ================================================================
        //  SECTION 16: RESIZE HANDLER
        // ================================================================
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
        });

        // Keyboard: Escape to close overlays
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (selectedFrame) closeFrameDetail();
                if (DOM.videoOverlay.classList.contains('active')) closeVideoPlayer();
            }
        });

        // ================================================================
        //  START THE MUSEUM
        // ================================================================
        animate();