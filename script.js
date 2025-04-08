// Henter container-div for Three.js-rendereren
      const container = document.getElementById("canvas-container");
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Oppretter scenen og setter bakgrunn til svart
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      // Oppretter kameraet med perspektiv
      const camera = new THREE.PerspectiveCamera(
        75, // synsvinkel
        containerWidth / containerHeight, // aspect ratio
        0.1, // nærgrense
        1000 // fjern grense
      );
      camera.position.z = 4; // Plasser kameraet bak planeten

      // Oppretter renderer og aktiverer skyggekart
      const renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(containerWidth, containerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // gir mykere skygger
      container.appendChild(renderer.domElement); // Legg renderer i DOM

      // Geometri for Neptun og skylagene
      const sphereGeometry = new THREE.SphereGeometry(1, 128, 128);
      let baseSphere, cloudSphere1, cloudSphere2;
      const textureLoader = new THREE.TextureLoader();

      // Laster Neptunens overflate og gjør den mottakelig for skygger
      textureLoader.load("tex5.jpg", function (baseTexture) {
        const baseMaterial = new THREE.MeshStandardMaterial({
          map: baseTexture,
          roughness: 0.7,
          metalness: 0.1,
        });
        baseSphere = new THREE.Mesh(sphereGeometry, baseMaterial);
        baseSphere.receiveShadow = true;
        scene.add(baseSphere);
      });

      // Skylag 1 (transparent og roterer separat)
      textureLoader.load("clouds1.png", function (cloudTexture1) {
        const cloudMaterial1 = new THREE.MeshStandardMaterial({
          map: cloudTexture1,
          transparent: true,
          depthWrite: false,
        });
        cloudSphere1 = new THREE.Mesh(sphereGeometry, cloudMaterial1);
        cloudSphere1.scale.set(1.01, 1.01, 1.01);
        scene.add(cloudSphere1);
      });

      // Skylag 2
      textureLoader.load("clouds2.png", function (cloudTexture2) {
        const cloudMaterial2 = new THREE.MeshStandardMaterial({
          map: cloudTexture2,
          transparent: true,
          depthWrite: false,
        });
        cloudSphere2 = new THREE.Mesh(sphereGeometry, cloudMaterial2);
        cloudSphere2.scale.set(1.03, 1.03, 1.03);
        scene.add(cloudSphere2);
      });

      // Oppretter lys som kaster skygger
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0); // starter med 0 intensitet
      directionalLight.position.set(0, 7, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      scene.add(directionalLight);

      // Lysanimasjon over 10 sekunder
      const lightAnimationDuration = 10000; 
      let startTime = null;

      // Data for månene: baneperiode og inklinasjon
      const moonsData = [
        { name: "Triton", orbitPeriod: 5.877, inclination: 157.865 },
        { name: "Proteus", orbitPeriod: 1.122, inclination: 0.0478 },
        { name: "Nereid", orbitPeriod: 10.136, inclination: 7.23 },
        { name: "Larissa", orbitPeriod: 0.555, inclination: 0.188 },
        { name: "Galatea", orbitPeriod: 0.429, inclination: 0.0231 },
        { name: "Despina", orbitPeriod: 0.335, inclination: 0.0583 },
      ];

      // Størrelseprosent for hver måne i forhold til referanse
      const moonSizePercentages = {
        Triton: 0.779,
        Proteus: 0.121,
        Nereid: 0.098,
        Larissa: 0.057,
        Galatea: 0.051,
        Despina: 0.044,
      };

      // Kobling mellom månenavn og bilde
      const moonTextureFiles = {
        Triton: "triton.jpg",
        Proteus: "proteus.jpg",
        Nereid: "nedeira.jpg",
        Larissa: "larissa.jpg",
        Galatea: "galatea.jpg",
        Despina: "despina.jpg",
      };

      // Verdier for bane og hastighet
      const referenceMoonDiameter = 0.5;
      const baseOrbitRadius = 1.8;
      const moons = [];
      const simulationSpeed = 1000;
      const dt = 1 / 60;

      // Opprett og plasser hver måne
      moonsData.forEach((moonData, i) => {
        const percentage = moonSizePercentages[moonData.name] || 0.1;
        const moonDiameter = referenceMoonDiameter * percentage;
        const moonRadius = moonDiameter / 2;
        const orbiterGeometry = new THREE.SphereGeometry(moonRadius, 16, 16);
        const textureFile = moonTextureFiles[moonData.name];

        textureLoader.load(textureFile, function (texture) {
          const orbiterMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.2,
          });
          const moonMesh = new THREE.Mesh(orbiterGeometry, orbiterMaterial);
          moonMesh.castShadow = true;

          // Initial posisjon og rotasjonsvinkel
          moonMesh.userData.orbitAngle = (i / moonsData.length) * Math.PI * 2;
          moonMesh.userData.orbitRadius = baseOrbitRadius + i * 0.3;

          // Beregn hastighet basert på baneperiode
          const orbitPeriodSeconds = moonData.orbitPeriod * 86400;
          let orbitSpeed =
            ((2 * Math.PI) / orbitPeriodSeconds) * dt * simulationSpeed;
          if (moonData.name === "Triton") orbitSpeed *= -1; // retrograd bane

          moonMesh.userData.orbitSpeed = orbitSpeed;
          moonMesh.userData.orbitInclination =
            (moonData.inclination * Math.PI) / 180;

          scene.add(moonMesh);
          moons.push(moonMesh);
        });
      });

      // Hovedanimasjonsløkke
      function animate(time) {
        requestAnimationFrame(animate);

        // Lysanimasjon: fade inn og senk posisjon
        if (!startTime) startTime = time;
        const elapsed = time - startTime;
        let t = elapsed / lightAnimationDuration;
        if (t > 1) t = 1;
        directionalLight.intensity = t;
        directionalLight.position.y = 7 - 7 * t;

        // Roter planet og skyer
        if (baseSphere) baseSphere.rotation.y += 0.004;
        if (cloudSphere1) cloudSphere1.rotation.y += 0.008;
        if (cloudSphere2) cloudSphere2.rotation.y += 0.012;

        // Oppdater posisjon for hver måne
        moons.forEach((moon) => {
          moon.userData.orbitAngle += moon.userData.orbitSpeed;
          const r = moon.userData.orbitRadius;
          const angle = moon.userData.orbitAngle;
          const inc = moon.userData.orbitInclination;
          const x = r * Math.cos(angle);
          const z = r * Math.sin(angle);
          const y = -z * Math.sin(inc);
          const zNew = z * Math.cos(inc);
          moon.position.set(x, y, zNew);
        });

        // Tegn scenen
        renderer.render(scene, camera);
      }
      animate();

      // Responsiv justering ved vindusstørrelse-endring
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth * 0.6666;
        const newHeight = window.innerHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      });

      // Spiller lyd etter 6 sekunder (når bruker laster siden)
      window.addEventListener("load", function () {
        setTimeout(function () {
          const audio = new Audio("neptune.mp3");
          audio.play().catch(function (error) {
            console.error("Audio playback failed:", error);
          });
        }, 6000);
      });
