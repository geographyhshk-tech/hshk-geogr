/**
 * GEOGRAPHY EDU - GLOBE 3D ENGINE
 * High School Help Kit Project
 *
 * Uses Three.js for WebGL rendering of a 3D interactive globe.
 * Features:
 *  - Earth textures (day/night from NASA Blue Marble)
 *  - Day/Night terminator line (astronomical calculation)
 *  - Country border polygons from GeoJSON (Natural Earth)
 *  - Click-to-select country with info panel
 *  - Zoom, rotate, tilt controls
 *  - Year slider to update demographic data
 *
 * Zero emoji policy: No Unicode emoji characters in this file.
 */

/* global THREE */

const GlobeEngine = (function () {
  // ── Internal state ──────────────────────────────────────────────────────
  let _scene, _camera, _renderer, _earth, _atmosphere, _clouds;
  let _countryLines = null;
  let _selectedCountryCode = null;
  let _highlightMesh = null;
  let _isDragging = false;
  let _previousMousePosition = { x: 0, y: 0 };
  let _rotationVelocity = { x: 0, y: 0 };
  let _autoRotate = true;
  let _currentYear = 2024;
  let _currentHour = 12; // UTC hour for day/night calculation
  let _animFrameId = null;
  let _container = null;
  let _raycaster, _mouse;
  let _earthRadius = 1.0;
  let _countriesGeoJSON = null;
  let _initialized = false;
  let _sunLight = null;
  let _overlayCanvas = null; // 2D overlay for labels

  // ── View mode (satellite | map) + map theme (light | dark) ─────────────
  let _viewMode = "satellite"; // "satellite" or "map"
  let _mapTheme = "light";     // "light" or "dark"
  let _earthMaterial = null;
  let _satelliteTexDay  = null;
  let _satelliteTexNight = null;
  let _mapTexLight = null;   // cached light political map texture
  let _mapTexDark  = null;   // cached dark political map texture
  let _capitalGroup = null;
  // Back-compat alias (used in _applyMapMode)
  Object.defineProperty(window, "__globePoliticalTex", { get: function() { return _mapTheme === "dark" ? _mapTexDark : _mapTexLight; }, configurable: true });

  // Texture URLs
  const TEXTURE_DAY      = "assets/earth_day.jpg";
  const TEXTURE_NIGHT    = "assets/earth_night.jpg";
  const TEXTURE_MAP_LIGHT = "assets/world_map.jpg";       // Political map (light)
  const TEXTURE_MAP_DARK  = "assets/world_map_dark.jpg";  // Political map (dark)
  // Assets for country boundaries
  const GEOJSON_URL = "assets/countries-50m.json";
  const GEOJSON_CDN_FALLBACK = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
  const TOPOJSON_LOCAL = "js/topojson-client.min.js";
  const TOPOJSON_CDN = "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js";

  // ── Country color mapping by region ────────────────────────────────────
  const REGION_COLORS = {
    "Asia":     { hex: 0x22c55e, css: "#22c55e", dark: "#15803d" },
    "Europe":   { hex: 0x3b82f6, css: "#3b82f6", dark: "#1d4ed8" },
    "Americas": { hex: 0xf59e0b, css: "#f59e0b", dark: "#b45309" },
    "Africa":   { hex: 0xef4444, css: "#ef4444", dark: "#b91c1c" },
    "Oceania":  { hex: 0xa855f7, css: "#a855f7", dark: "#7e22ce" }
  };
  const REGION_CSS_FALLBACK = "#64748b";
  const REGION_HEX_FALLBACK = 0x64748b;

  const HIGHLIGHT_COLOR = 0xfbbf24;
  const DEFAULT_BORDER_COLOR = 0xffffff;

  // ── PUBLIC API ──────────────────────────────────────────────────────────
  function init(containerId) {
    _container = document.getElementById(containerId);
    if (!_container) { console.error("GlobeEngine: Container not found:", containerId); return false; }
    if (typeof THREE === "undefined") { console.error("GlobeEngine: Three.js not loaded"); return false; }

    // Guard: container must have valid layout dimensions
    const w = _container.clientWidth || _container.offsetWidth;
    const h = _container.clientHeight || _container.offsetHeight;
    if (w === 0 || h === 0) {
      console.warn("GlobeEngine: Container has zero dimensions, deferring init");
      return false;
    }

    _setupScene();
    _setupCamera();
    _setupRenderer();
    _setupLighting();
    _createEarth();
    _createAtmosphere();
    _setupInteraction();
    _animate();
    _updateDayNight(_currentHour);

    // Load GeoJSON country borders after scene is ready
    _loadCountryBorders();

    _initialized = true;
    window.dispatchEvent(new CustomEvent("globe-ready"));
    return true;
  }

  function destroy() {
    if (_animFrameId) cancelAnimationFrame(_animFrameId);
    window.removeEventListener("resize", _onWindowResize);
    if (_renderer) {
      _renderer.dispose();
      if (_renderer.domElement && _renderer.domElement.parentNode) {
        _renderer.domElement.parentNode.removeChild(_renderer.domElement);
      }
    }
    _scene = _camera = _renderer = _earth = null;
    _initialized = false;
  }

  function setDayNight(hour) {
    _currentHour = Math.max(0, Math.min(23, hour));
    _updateDayNight(_currentHour);
  }

  function setYear(year) {
    _currentYear = year;
    if (_selectedCountryCode) {
      _refreshCountryPanel(_selectedCountryCode);
    }
  }

  function zoomIn() {
    if (!_camera) return;
    _camera.position.multiplyScalar(0.85);
    _clampCamera();
  }

  function zoomOut() {
    if (!_camera) return;
    _camera.position.multiplyScalar(1.18);
    _clampCamera();
  }

  function _getDefaultCameraDistance() {
    if (!_container) return 2.8;
    const w = _container.clientWidth || _container.offsetWidth || window.innerWidth;
    const h = _container.clientHeight || _container.offsetHeight || window.innerHeight;
    if (!w || !h) return 2.8;
    const aspect = w / h;
    if (aspect < 1.0) {
      // In portrait mode, zoom out proportionally so the full globe (radius 1.0)
      // fits cleanly in the mobile viewport with comfortable side margins.
      return Math.max(2.8, 1.30 / (Math.tan(22.5 * Math.PI / 180) * aspect));
    }
    return 2.8;
  }

  function resetView() {
    if (!_camera) return;
    _camera.position.set(0, 0, _getDefaultCameraDistance());
    _camera.lookAt(0, 0, 0);
    _rotationVelocity = { x: 0, y: 0 };
    _autoRotate = true;
    if (_earth) _earth.rotation.set(0, -Math.PI / 2, 0.4);
  }

  function focusCountry(code) {
    const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
    if (!data) return;
    _rotateToLatLng(data.lat, data.lng);
  }

  function getSelectedYear() { return _currentYear; }
  function isInitialized() { return _initialized; }

  // ── PRIVATE: Scene Setup ────────────────────────────────────────────────
  function _setupScene() {
    _scene = new THREE.Scene();
    _scene.background = new THREE.Color(0x020818);

    // Stars (particle field)
    const starGeom = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 8000; i++) {
      const r = 50 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    starGeom.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8 });
    _scene.add(new THREE.Points(starGeom, starMat));
  }

  function _setupCamera() {
    const w = _container.clientWidth || _container.offsetWidth || 800;
    const h = _container.clientHeight || _container.offsetHeight || 600;
    const aspect = w / h;
    _camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    _camera.position.set(0, 0, _getDefaultCameraDistance());
  }

  function _setupRenderer() {
    const w = _container.clientWidth || _container.offsetWidth || 800;
    const h = _container.clientHeight || _container.offsetHeight || 600;
    _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.setSize(w, h);
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.2;
    _container.appendChild(_renderer.domElement);

    window.addEventListener("resize", _onWindowResize);
  }

  function _setupLighting() {
    // Ambient light - bright enough to see earth even on night side
    const ambient = new THREE.AmbientLight(0x334466, 1.2);
    _scene.add(ambient);

    // Secondary fill light from opposite side (so dark side isn't pure black)
    const fillLight = new THREE.DirectionalLight(0x112244, 0.4);
    fillLight.position.set(-5, 0, 0);
    _scene.add(fillLight);

    // Sun light (directional, moves based on hour)
    _sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
    _sunLight.position.set(5, 0, 0);
    _scene.add(_sunLight);
  }

  function _createEarth() {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    const geometry = new THREE.SphereGeometry(_earthRadius, 64, 64);

    // Material with fallback color (visible even without texture)
    const material = new THREE.MeshPhongMaterial({
      color: 0x2255aa,          // fallback: ocean blue
      specular: new THREE.Color(0x111122),
      shininess: 15,
      emissive: new THREE.Color(0x001133),
      emissiveIntensity: 0.1
    });

    // Store material reference so setViewMode can swap textures
    _earthMaterial = material;

    _earth = new THREE.Mesh(geometry, material);
    _earth.rotation.set(0, -Math.PI / 2, 0.4);
    _scene.add(_earth);

    // Build absolute base URL for texture paths
    const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, "/");

    // Load day texture
    loader.load(
      base + TEXTURE_DAY,
      function (tex) {
        _satelliteTexDay = tex;       // cache for mode switching
        material.map = tex;
        material.color.set(0xffffff); // let texture show true colors
        material.needsUpdate = true;
        console.log("GlobeEngine: Day texture loaded OK");
      },
      undefined,
      function (err) { console.warn("GlobeEngine: Failed to load day texture", err); }
    );

    // Load night texture (city lights)
    loader.load(
      base + TEXTURE_NIGHT,
      function (tex) {
        _satelliteTexNight = tex;
        material.emissiveMap = tex;
        material.emissive.set(0x223366);
        material.emissiveIntensity = 0.4;
        material.needsUpdate = true;
        console.log("GlobeEngine: Night texture loaded OK");
      },
      undefined,
      function (err) { console.warn("GlobeEngine: Failed to load night texture", err); }
    );
  }

  function _createAtmosphere() {
    // Atmospheric glow (additive blue ring)
    const atmosGeo = new THREE.SphereGeometry(_earthRadius * 1.015, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.FrontSide,
      depthWrite: false
    });
    _atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
    _scene.add(_atmosphere);

    // Outer glow ring
    const glowGeo = new THREE.SphereGeometry(_earthRadius * 1.03, 32, 32);
    const glowMat = new THREE.MeshPhongMaterial({
      color: 0x2255cc,
      transparent: true,
      opacity: 0.025,
      side: THREE.BackSide,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    _scene.add(glow);
  }

  // ── PRIVATE: Day/Night Terminator ──────────────────────────────────────
  function _updateDayNight(utcHour) {
    if (!_sunLight) return;

    // Sun declination approximation (simplified astronomy)
    const dayOfYear = new Date().getDate() + ([0,31,59,90,120,151,181,212,243,273,304,334][new Date().getMonth()] || 0);
    const declinationRad = (23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365)) * Math.PI / 180;

    // Sun position in 3D: hour angle
    const hourAngle = (utcHour / 24) * Math.PI * 2 - Math.PI;

    const sunX = Math.cos(declinationRad) * Math.cos(hourAngle);
    const sunY = Math.sin(declinationRad);
    const sunZ = Math.cos(declinationRad) * Math.sin(hourAngle);

    _sunLight.position.set(sunX * 10, sunY * 10, sunZ * 10);

    // Adjust emissive (city lights) intensity based on time
    if (_earth && _earth.material) {
      // Night side glows more
      _earth.material.emissiveIntensity = 0.15;
    }
  }

  // ── PRIVATE: Standard Equirectangular Map Texture from GeoJSON ────────
  function _generatePoliticalMapTexture(theme) {
    const W = 2048, H = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const isDark = (theme === "dark");

    // 1. Ocean background - vivid, rich blue (avoid pale washed-out white)
    ctx.fillStyle = isDark ? "#080e1a" : "#0284c7";
    ctx.fillRect(0, 0, W, H);

    // 2. Graticules (Latitude & Longitude grid lines)
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = (90 - lat) / 180 * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let lng = -150; lng <= 180; lng += 30) {
      const x = (lng + 180) / 360 * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    // Equator accent line
    ctx.strokeStyle = isDark ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    // 3. Render all countries with distinct, vibrant regional colors
    if (_countriesGeoJSON && window.topojson) {
      const countries = topojson.feature(_countriesGeoJSON, _countriesGeoJSON.objects.countries);

      // High-contrast, vibrant palette so every continent and country is instantly distinguishable
      const regionColorsLight = {
        "Asia": "#10b981",     // Emerald green
        "Europe": "#3b82f6",   // Blue
        "Africa": "#f59e0b",   // Amber gold
        "Americas": "#f97316", // Orange
        "Oceania": "#a855f7"   // Purple
      };
      const regionColorsDark = {
        "Asia": "#065f46",
        "Europe": "#1e3a8a",
        "Africa": "#854d0e",
        "Americas": "#9a3412",
        "Oceania": "#6b21a8"
      };

      const fallbackLight = ["#ec4899", "#06b6d4", "#84cc16", "#eab308", "#6366f1", "#14b8a6"];
      const fallbackDark  = ["#831843", "#164e63", "#365314", "#713f12", "#312e81", "#134e4a"];

      countries.features.forEach(function (feature, idx) {
        const code = _numericToAlpha3(feature.id);
        const data = code && window.GLOBE_COUNTRY_DATA ? window.GLOBE_COUNTRY_DATA[code] : null;
        const region = data ? data.region : null;

        let fillCol;
        if (isDark) {
          fillCol = (region && regionColorsDark[region]) ? regionColorsDark[region] : fallbackDark[idx % fallbackDark.length];
        } else {
          fillCol = (region && regionColorsLight[region]) ? regionColorsLight[region] : fallbackLight[idx % fallbackLight.length];
        }

        ctx.fillStyle = fillCol;
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.4)" : "#ffffff";
        ctx.lineWidth = isDark ? 0.8 : 1.0;

        const geom = feature.geometry;
        if (!geom) return;
        const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];

        ctx.beginPath();
        polygons.forEach(function (polygon) {
          polygon.forEach(function (ring) {
            ring.forEach(function (pt, i) {
              const x = (pt[0] + 180) / 360 * W;
              const y = (90 - pt[1]) / 180 * H;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.closePath();
          });
        });
        ctx.fill();
        ctx.stroke();
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  // ── PRIVATE: Country Borders (GeoJSON) ────────────────────────────────
  function _loadCountryBorders() {
    function doFetch() {
      fetch(GEOJSON_URL)
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .catch(function () {
          return fetch(GEOJSON_CDN_FALLBACK).then(function (r) { return r.json(); });
        })
        .then(function (world) {
          _countriesGeoJSON = world;
          _mapTexLight = _generatePoliticalMapTexture("light");
          _mapTexDark  = _generatePoliticalMapTexture("dark");
          _drawCountryBorders(world);
          _createCapitalMarkers();
          if (_viewMode === "map") _applyMapMode();
        })
        .catch(function (e) {
          console.warn("GlobeEngine: Could not load country borders", e);
        });
    }

    if (window.topojson) {
      doFetch();
    } else {
      _loadScript(TOPOJSON_LOCAL, function () {
        if (window.topojson) {
          doFetch();
        } else {
          _loadScript(TOPOJSON_CDN, doFetch);
        }
      });
    }
  }

  function _loadScript(src, callback) {
    if (document.querySelector('script[src="' + src + '"]')) {
      callback();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = callback;
    s.onerror = function () { console.warn("Script load failed:", src); };
    document.head.appendChild(s);
  }

  function _drawCountryBorders(world) {
    if (!window.topojson) return;
    const countries = topojson.feature(world, world.objects.countries);
    const borderGroup = new THREE.Group();
    borderGroup.name = "countryBorders";

    countries.features.forEach(function (feature) {
      const lines = _geoFeatureToLines(feature);
      if (lines) borderGroup.add(lines);
    });

    if (_earth) _earth.add(borderGroup);
    _countryLines = borderGroup;
  }

  function _geoFeatureToLines(feature) {
    const material = new THREE.LineBasicMaterial({
      color: DEFAULT_BORDER_COLOR,
      transparent: true,
      opacity: 0.55,
      linewidth: 1
    });

    const group = new THREE.Group();
    group.userData.code = _numericToAlpha3(feature.id);
    group.userData.featureId = feature.id;

    const geom = feature.geometry;
    const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];

    polygons.forEach(function (polygon) {
      polygon.forEach(function (ring) {
        const points = ring.map(function (coord) {
          return _latLngToVector3(coord[1], coord[0], _earthRadius + 0.001);
        });
        if (points.length < 2) return;
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        group.add(new THREE.Line(geometry, material));
      });
    });

    return group;
  }

  // Convert lat/lng to 3D point on sphere surface
  function _latLngToVector3(lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // ── Complete ISO 3166-1 numeric → alpha-3 mapping (UN-recognized territories) ──
  const NUMERIC_TO_ALPHA3 = {
    "004":"AFG","008":"ALB","012":"DZA","016":"ASM","020":"AND",
    "024":"AGO","028":"ATG","031":"AZE","032":"ARG","036":"AUS",
    "040":"AUT","044":"BHS","048":"BHR","050":"BGD","051":"ARM",
    "052":"BRB","056":"BEL","060":"BMU","064":"BTN","068":"BOL",
    "070":"BIH","072":"BWA","076":"BRA","084":"BLZ","090":"SLB",
    "096":"BRN","100":"BGR","104":"MMR","108":"BDI","112":"BLR",
    "116":"KHM","120":"CMR","124":"CAN","132":"CPV","136":"CYM",
    "140":"CAF","144":"LKA","148":"TCD","152":"CHL","156":"CHN",
    "158":"TWN","170":"COL","174":"COM","175":"MYT","178":"COG",
    "180":"COD","184":"COK","188":"CRI","191":"HRV","192":"CUB",
    "196":"CYP","203":"CZE","204":"BEN","208":"DNK","212":"DMA",
    "214":"DOM","218":"ECU","222":"SLV","226":"GNQ","231":"ETH",
    "232":"ERI","233":"EST","238":"FLK","242":"FJI","246":"FIN",
    "250":"FRA","254":"GUF","258":"PYF","262":"DJI","266":"GAB",
    "268":"GEO","270":"GMB","275":"PSE","276":"DEU","288":"GHA",
    "292":"GIB","296":"KIR","300":"GRC","304":"GRL","308":"GRD",
    "312":"GLP","316":"GUM","320":"GTM","324":"GIN","328":"GUY",
    "332":"HTI","336":"VAT","340":"HND","344":"HKG","348":"HUN",
    "352":"ISL","356":"IND","360":"IDN","364":"IRN","368":"IRQ",
    "372":"IRL","376":"ISR","380":"ITA","384":"CIV","388":"JAM",
    "392":"JPN","398":"KAZ","400":"JOR","404":"KEN","408":"PRK",
    "410":"KOR","414":"KWT","417":"KGZ","418":"LAO","422":"LBN",
    "426":"LSO","428":"LVA","430":"LBR","434":"LBY","438":"LIE",
    "440":"LTU","442":"LUX","446":"MAC","450":"MDG","454":"MWI",
    "458":"MYS","462":"MDV","466":"MLI","470":"MLT","478":"MRT",
    "480":"MUS","484":"MEX","492":"MCO","496":"MNG","498":"MDA",
    "499":"MNE","504":"MAR","508":"MOZ","512":"OMN","516":"NAM",
    "520":"NRU","524":"NPL","528":"NLD","531":"CUW","533":"ABW",
    "534":"SXM","540":"NCL","548":"VUT","554":"NZL","558":"NIC",
    "562":"NER","566":"NGA","578":"NOR","583":"FSM","584":"MHL",
    "585":"PLW","586":"PAK","591":"PAN","598":"PNG","600":"PRY",
    "604":"PER","608":"PHL","616":"POL","620":"PRT","624":"GNB",
    "626":"TLS","630":"PRI","634":"QAT","638":"REU","642":"ROU",
    "643":"RUS","646":"RWA","652":"BLM","654":"SHN","659":"KNA",
    "660":"AIA","662":"LCA","666":"SPM","670":"VCT","674":"SMR",
    "678":"STP","682":"SAU","686":"SEN","688":"SRB","690":"SYC",
    "694":"SLE","702":"SGP","703":"SVK","704":"VNM","705":"SVN",
    "706":"SOM","710":"ZAF","716":"ZWE","724":"ESP","728":"SSD",
    "729":"SDN","732":"ESH","740":"SUR","748":"SWZ","752":"SWE",
    "756":"CHE","760":"SYR","762":"TJK","764":"THA","768":"TGO",
    "776":"TON","780":"TTO","784":"ARE","788":"TUN","792":"TUR",
    "795":"TKM","798":"TUV","800":"UGA","804":"UKR","807":"MKD",
    "818":"EGY","826":"GBR","831":"GGY","832":"JEY","834":"TZA",
    "840":"USA","850":"VIR","854":"BFA","858":"URY","860":"UZB",
    "862":"VEN","882":"WSM","887":"YEM","894":"ZMB","010":"ATA"
  };

  // Display names for countries not in GLOBE_COUNTRY_DATA
  const COUNTRY_NAMES_EN = {
    "AFG":"Afghanistan","ALB":"Albania","DZA":"Algeria","AND":"Andorra",
    "AGO":"Angola","ATG":"Antigua and Barbuda","ARG":"Argentina",
    "ARM":"Armenia","AUS":"Australia","AUT":"Austria","AZE":"Azerbaijan",
    "BHS":"Bahamas","BHR":"Bahrain","BGD":"Bangladesh","BRB":"Barbados",
    "BLR":"Belarus","BEL":"Belgium","BLZ":"Belize","BEN":"Benin",
    "BTN":"Bhutan","BOL":"Bolivia","BIH":"Bosnia and Herzegovina",
    "BWA":"Botswana","BRA":"Brazil","BRN":"Brunei","BGR":"Bulgaria",
    "BFA":"Burkina Faso","BDI":"Burundi","CPV":"Cabo Verde","KHM":"Cambodia",
    "CMR":"Cameroon","CAN":"Canada","CAF":"Central African Republic",
    "TCD":"Chad","CHL":"Chile","CHN":"China","COL":"Colombia",
    "COM":"Comoros","COG":"Congo","COD":"DR Congo","CRI":"Costa Rica",
    "HRV":"Croatia","CUB":"Cuba","CYP":"Cyprus","CZE":"Czech Republic",
    "DNK":"Denmark","DJI":"Djibouti","DMA":"Dominica",
    "DOM":"Dominican Republic","ECU":"Ecuador","EGY":"Egypt",
    "SLV":"El Salvador","GNQ":"Equatorial Guinea","ERI":"Eritrea",
    "EST":"Estonia","SWZ":"Eswatini","ETH":"Ethiopia","FJI":"Fiji",
    "FIN":"Finland","FRA":"France","GAB":"Gabon","GMB":"Gambia",
    "GEO":"Georgia","DEU":"Germany","GHA":"Ghana","GRC":"Greece",
    "GRD":"Grenada","GTM":"Guatemala","GIN":"Guinea","GNB":"Guinea-Bissau",
    "GUY":"Guyana","HTI":"Haiti","HND":"Honduras","HUN":"Hungary",
    "ISL":"Iceland","IND":"India","IDN":"Indonesia","IRN":"Iran",
    "IRQ":"Iraq","IRL":"Ireland","ISR":"Israel","ITA":"Italy",
    "CIV":"Ivory Coast","JAM":"Jamaica","JPN":"Japan","JOR":"Jordan",
    "KAZ":"Kazakhstan","KEN":"Kenya","PRK":"North Korea","KOR":"South Korea",
    "KWT":"Kuwait","KGZ":"Kyrgyzstan","LAO":"Laos","LVA":"Latvia",
    "LBN":"Lebanon","LSO":"Lesotho","LBR":"Liberia","LBY":"Libya",
    "LIE":"Liechtenstein","LTU":"Lithuania","LUX":"Luxembourg",
    "MDG":"Madagascar","MWI":"Malawi","MYS":"Malaysia","MDV":"Maldives",
    "MLI":"Mali","MLT":"Malta","MHL":"Marshall Islands","MRT":"Mauritania",
    "MUS":"Mauritius","MEX":"Mexico","FSM":"Micronesia","MDA":"Moldova",
    "MCO":"Monaco","MNG":"Mongolia","MNE":"Montenegro","MAR":"Morocco",
    "MOZ":"Mozambique","MMR":"Myanmar","NAM":"Namibia","NRU":"Nauru",
    "NPL":"Nepal","NLD":"Netherlands","NZL":"New Zealand","NIC":"Nicaragua",
    "NER":"Niger","NGA":"Nigeria","MKD":"North Macedonia","NOR":"Norway",
    "OMN":"Oman","PAK":"Pakistan","PLW":"Palau","PSE":"Palestine",
    "PAN":"Panama","PNG":"Papua New Guinea","PRY":"Paraguay","PER":"Peru",
    "PHL":"Philippines","POL":"Poland","PRT":"Portugal","QAT":"Qatar",
    "ROU":"Romania","RUS":"Russia","RWA":"Rwanda","KNA":"Saint Kitts and Nevis",
    "LCA":"Saint Lucia","VCT":"Saint Vincent and the Grenadines",
    "WSM":"Samoa","SMR":"San Marino","STP":"Sao Tome and Principe",
    "SAU":"Saudi Arabia","SEN":"Senegal","SRB":"Serbia","SYC":"Seychelles",
    "SLE":"Sierra Leone","SGP":"Singapore","SVK":"Slovakia","SVN":"Slovenia",
    "SLB":"Solomon Islands","SOM":"Somalia","ZAF":"South Africa",
    "SSD":"South Sudan","ESP":"Spain","LKA":"Sri Lanka","SDN":"Sudan",
    "SUR":"Suriname","SWE":"Sweden","CHE":"Switzerland","SYR":"Syria",
    "TWN":"Taiwan","TJK":"Tajikistan","TZA":"Tanzania","THA":"Thailand",
    "TLS":"Timor-Leste","TGO":"Togo","TON":"Tonga","TTO":"Trinidad and Tobago",
    "TUN":"Tunisia","TUR":"Turkey","TKM":"Turkmenistan","TUV":"Tuvalu",
    "UGA":"Uganda","UKR":"Ukraine","ARE":"United Arab Emirates",
    "GBR":"United Kingdom","USA":"United States","URY":"Uruguay",
    "UZB":"Uzbekistan","VUT":"Vanuatu","VAT":"Vatican City","VEN":"Venezuela",
    "VNM":"Viet Nam","YEM":"Yemen","ZMB":"Zambia","ZWE":"Zimbabwe",
    "GRL":"Greenland","ESH":"Western Sahara","FLK":"Falkland Islands",
    "MAC":"Macao","HKG":"Hong Kong","NCL":"New Caledonia","PYF":"French Polynesia",
    "ATA":"Antarctica","GUF":"French Guiana","BLM":"Saint Barthelemy"
  };

  function _numericToAlpha3(id) {
    return NUMERIC_TO_ALPHA3[String(id).padStart(3, "0")] || null;
  }

  function _getCountryDisplayName(code, feature) {
    if (!code) return "Country #" + (feature ? feature.id : "?");
    const d = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
    if (d && d.name) return d.name.vi || d.name.en || code;
    return COUNTRY_NAMES_EN[code] || code;
  }


  // ── PRIVATE: Interaction ───────────────────────────────────────────────
  function _setupInteraction() {
    _raycaster = new THREE.Raycaster();
    _mouse = new THREE.Vector2();

    const canvas = _renderer.domElement;

    // Mouse events
    canvas.addEventListener("mousedown", _onMouseDown);
    canvas.addEventListener("mousemove", _onMouseMove);
    canvas.addEventListener("mouseup", _onMouseUp);
    canvas.addEventListener("click", _onClick);
    canvas.addEventListener("wheel", _onWheel, { passive: true });

    // Touch events
    canvas.addEventListener("touchstart", _onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", _onTouchMove, { passive: false });
    canvas.addEventListener("touchend", _onTouchEnd);
  }

  let _touchStartX = 0, _touchStartY = 0, _touchStartDist = 0;
  let _touchStartTime = 0;
  let _touchTotalMoved = 0;

  function _onTouchStart(e) {
    e.preventDefault();
    const hint = document.getElementById("globe-hint-overlay");
    if (hint && hint.style.opacity !== "0") {
      hint.style.transition = "opacity 0.4s ease";
      hint.style.opacity = "0";
      setTimeout(function () { hint.style.display = "none"; }, 400);
    }
    if (typeof window.toggleGlobeControls === "function") {
      window.toggleGlobeControls(false);
    }
    if (e.touches.length === 1) {
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
      _touchStartTime = Date.now();
      _touchTotalMoved = 0;
      _isDragging = true;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _touchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && _isDragging && _earth) {
      const dx = e.touches[0].clientX - _touchStartX;
      const dy = e.touches[0].clientY - _touchStartY;
      _touchTotalMoved += Math.abs(dx) + Math.abs(dy);
      _earth.rotation.y += dx * 0.005;
      _earth.rotation.x += dy * 0.005;
      _clampEarthTilt();
      _touchStartX = e.touches[0].clientX;
      _touchStartY = e.touches[0].clientY;
      _autoRotate = false;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (_touchStartDist > 0) {
        const scale = dist / _touchStartDist;
        if (scale > 1) zoomIn(); else zoomOut();
      }
      _touchStartDist = dist;
    }
  }

  function _onTouchEnd() {
    _isDragging = false;
    // Mobile tap detection: if finger moved < 12px and duration < 450ms, trigger click
    if (_touchTotalMoved < 12 && (Date.now() - _touchStartTime) < 450) {
      _handleRaycastClick(_touchStartX, _touchStartY);
    }
  }

  function _onMouseDown(e) {
    _isDragging = true;
    _previousMousePosition = { x: e.clientX, y: e.clientY };
    _rotationVelocity = { x: 0, y: 0 };
    _autoRotate = false;
  }

  function _onMouseMove(e) {
    if (!_isDragging || !_earth) return;
    const dx = e.clientX - _previousMousePosition.x;
    const dy = e.clientY - _previousMousePosition.y;

    _rotationVelocity.x = dy * 0.003;
    _rotationVelocity.y = dx * 0.003;

    _earth.rotation.x += _rotationVelocity.x;
    _earth.rotation.y += _rotationVelocity.y;
    _clampEarthTilt();

    _previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  function _onMouseUp() {
    _isDragging = false;
    // Keep some inertia
    setTimeout(function () { _autoRotate = false; }, 2000);
  }

  function _handleRaycastClick(clientX, clientY) {
    const rect = _renderer.domElement.getBoundingClientRect();
    _mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_mouse, _camera);

    // 1. Raycast capital markers first (fast & reliable for microstates)
    if (_capitalGroup && _capitalGroup.visible && _capitalGroup.children.length > 0) {
      const capHits = _raycaster.intersectObjects(_capitalGroup.children, false);
      if (capHits.length > 0) {
        const hitCap = capHits[0].object;
        if (hitCap.userData && hitCap.userData.code) {
          _selectCountry(hitCap.userData.code);
          return;
        }
      }
    }

    // 2. Intersect Earth sphere surface
    const hits = _raycaster.intersectObject(_earth, false);
    if (hits.length > 0) {
      const point = hits[0].point;
      const localPoint = _earth.worldToLocal(point.clone());
      const clampedY = Math.max(-1, Math.min(1, localPoint.y / _earthRadius));
      const lat = 90 - Math.acos(clampedY) * 180 / Math.PI;
      let lng = (Math.atan2(localPoint.z, -localPoint.x) * 180 / Math.PI) - 180;
      while (lng < -180) lng += 360;
      while (lng > 180) lng -= 360;
      _findCountryAtLatLng(lat, lng);
    } else {
      _clearHighlight();
      hideCountryPanel();
    }
  }

  function _onClick(e) {
    if (Math.abs(_rotationVelocity.x) > 0.003 || Math.abs(_rotationVelocity.y) > 0.003) return;
    _handleRaycastClick(e.clientX, e.clientY);
  }

  function _onWheel(e) {
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  }

  function _clampEarthTilt() {
    if (_earth) {
      _earth.rotation.x = Math.max(-1.2, Math.min(1.2, _earth.rotation.x));
    }
  }

  function _clampCamera() {
    if (!_camera) return;
    const dist = _camera.position.length();
    const maxDist = Math.max(6.0, _getDefaultCameraDistance() * 1.5);
    if (dist < 1.15) _camera.position.multiplyScalar(1.15 / dist);
    if (dist > maxDist) _camera.position.multiplyScalar(maxDist / dist);
  }

  // ── PRIVATE: Country Click Detection ──────────────────────────────────
  // Point-in-polygon ray casting for a single ring
  function _pointInRing(lat, lng, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function _findCountryAtLatLng(lat, lng) {
    // PRIMARY: Point-in-polygon with real GeoJSON for all polygonal countries
    if (_countriesGeoJSON && window.topojson) {
      const countries = topojson.feature(_countriesGeoJSON, _countriesGeoJSON.objects.countries);
      for (let fi = 0; fi < countries.features.length; fi++) {
        const feature = countries.features[fi];
        const geom = feature.geometry;
        if (!geom) continue;
        const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
        let hit = false;
        for (let pi = 0; pi < polygons.length && !hit; pi++) {
          if (polygons[pi][0] && _pointInRing(lat, lng, polygons[pi][0])) {
            hit = true;
          }
        }
        if (hit) {
          const code = _numericToAlpha3(feature.id);
          if (code && window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code]) {
            _selectCountry(code);
            return;
          } else if (code) {
            _showUnknownCountryPanel(feature, code);
            return;
          }
        }
      }
    }

    // SECONDARY / FALLBACK:
    // Microstates (Vatican, Monaco, Singapore, Malta, San Marino, Andorra, Bahrain, etc.)
    // or tiny island archipelagos / coastal clicks where polygon resolution is coarse.
    // Use spherical great-circle angular distance to all country centroids.
    if (window.GLOBE_COUNTRY_DATA) {
      let bestCode = null, bestDist = Infinity;
      const rad = Math.PI / 180;
      const latRad = lat * rad;
      const lngRad = lng * rad;

      for (const code in window.GLOBE_COUNTRY_DATA) {
        const c = window.GLOBE_COUNTRY_DATA[code];
        if (typeof c.lat !== "number" || typeof c.lng !== "number") continue;
        const cLatRad = c.lat * rad;
        const cLngRad = c.lng * rad;
        const cosD = Math.sin(latRad) * Math.sin(cLatRad) +
                     Math.cos(latRad) * Math.cos(cLatRad) * Math.cos(lngRad - cLngRad);
        const angDist = Math.acos(Math.max(-1, Math.min(1, cosD))) * (180 / Math.PI);
        if (angDist < bestDist) {
          bestDist = angDist;
          bestCode = code;
        }
      }

      // Snap if within 5.5 degrees (~600 km)
      if (bestCode && bestDist <= 5.5) {
        _selectCountry(bestCode);
        return;
      }
    }

    // Truly open ocean click
    _clearHighlight();
    hideCountryPanel();
  }

  // ── PRIVATE: 3D Extruded Country Block (Style Noi Khoi) ───────────────
  function _createCountryExtrudedMesh(code) {
    if (!_countriesGeoJSON || !window.topojson || !_earth) return;
    const countries = topojson.feature(_countriesGeoJSON, _countriesGeoJSON.objects.countries);
    const targetFeature = countries.features.find(function (f) {
      return _numericToAlpha3(f.id) === code;
    });
    if (!targetFeature || !targetFeature.geometry) return;

    const geom = targetFeature.geometry;
    const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
    const group = new THREE.Group();
    group.name = "extrudedCountryBlock";

    // Elevation for 3D "noi khoi"
    const baseR = _earthRadius + 0.002;
    const topR  = _earthRadius + 0.015;

    const capPositions = [];
    const wallPositions = [];

    polygons.forEach(function (polygon) {
      polygon.forEach(function (ring, ringIdx) {
        if (ring.length < 3) return;

        // Triangulate top surface for the exterior ring
        if (ringIdx === 0) {
          const pts2d = ring.map(function (pt) { return { x: pt[0], y: pt[1] }; });
          let triangles = [];
          if (THREE.ShapeUtils && THREE.ShapeUtils.triangulateShape) {
            try {
              triangles = THREE.ShapeUtils.triangulateShape(pts2d, []);
            } catch (err) {
              triangles = [];
            }
          }
          if (!triangles || triangles.length === 0) {
            for (let i = 1; i < ring.length - 1; i++) {
              triangles.push([0, i, i + 1]);
            }
          }

          triangles.forEach(function (tri) {
            const i0 = tri[0], i1 = tri[1], i2 = tri[2];
            if (ring[i0] && ring[i1] && ring[i2]) {
              const p0 = _latLngToVector3(ring[i0][1], ring[i0][0], topR);
              const p1 = _latLngToVector3(ring[i1][1], ring[i1][0], topR);
              const p2 = _latLngToVector3(ring[i2][1], ring[i2][0], topR);
              capPositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
            }
          });
        }

        // Side walls (skirts) along perimeter edges
        for (let i = 0; i < ring.length - 1; i++) {
          const ptA = ring[i];
          const ptB = ring[i + 1];
          const bA = _latLngToVector3(ptA[1], ptA[0], baseR);
          const tA = _latLngToVector3(ptA[1], ptA[0], topR);
          const bB = _latLngToVector3(ptB[1], ptB[0], baseR);
          const tB = _latLngToVector3(ptB[1], ptB[0], topR);

          wallPositions.push(
            tA.x, tA.y, tA.z,  bA.x, bA.y, bA.z,  tB.x, tB.y, tB.z,
            bA.x, bA.y, bA.z,  bB.x, bB.y, bB.z,  tB.x, tB.y, tB.z
          );
        }
      });
    });

    if (capPositions.length > 0) {
      const capGeom = new THREE.BufferGeometry();
      capGeom.setAttribute("position", new THREE.Float32BufferAttribute(capPositions, 3));
      capGeom.computeVertexNormals();

      const capMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.3,
        side: THREE.DoubleSide
      });
      group.add(new THREE.Mesh(capGeom, capMat));
    }

    if (wallPositions.length > 0) {
      const wallGeom = new THREE.BufferGeometry();
      wallGeom.setAttribute("position", new THREE.Float32BufferAttribute(wallPositions, 3));
      wallGeom.computeVertexNormals();

      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x92400e,
        emissive: 0x78350f,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.5,
        side: THREE.DoubleSide
      });
      group.add(new THREE.Mesh(wallGeom, wallMat));
    }

    _highlightMesh = group;
    _earth.add(_highlightMesh);
  }

  function _selectCountry(code) {
    _selectedCountryCode = code;
    _clearHighlight();
    _highlightCountryLines(code);
    _createCountryExtrudedMesh(code);
    showCountryPanel(code);
    _syncCountrySelectorUI(code);
    // Hide hint overlay on first country selection
    const hint = document.getElementById("globe-hint-overlay");
    if (hint) hint.style.opacity = "0";
  }

  function _showUnknownCountryPanel(feature, code) {
    _selectedCountryCode = code || null;
    _clearHighlight();
    if (code) {
      _highlightCountryLines(code);
      _createCountryExtrudedMesh(code);
    }

    const panel = document.getElementById("globe-country-panel");
    if (!panel) return;

    const displayName = _getCountryDisplayName(code, feature);
    const region = (code && window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code] && window.GLOBE_COUNTRY_DATA[code].region) || "";

    panel.innerHTML = `
      <div class="globe-panel-header">
        <div class="globe-panel-title-row">
          <div>
            <h2 class="globe-panel-country-name">${displayName}</h2>
            ${region ? `<span class="globe-panel-region">${region}</span>` : `<span class="globe-panel-region">ISO: ${code || feature.id}</span>`}
          </div>
        </div>
        <button class="globe-panel-close-btn" onclick="GlobeEngine.hideCountryPanel()" aria-label="Close">&times;</button>
      </div>
      <div style="padding:20px 16px;color:#94a3b8;font-size:0.87rem;line-height:1.7;">
        <p style="margin:0 0 8px;">Du lieu thong ke chi tiet cho quoc gia nay chua duoc cap nhat trong he thong.</p>
        <p style="margin:0;font-size:0.78rem;color:#64748b;">Ma quoc gia: <code style="background:rgba(255,255,255,0.07);padding:1px 5px;border-radius:3px;">${code || feature.id}</code></p>
      </div>
    `;
    panel.classList.add("open");

    const hint = document.getElementById("globe-hint-overlay");
    if (hint) hint.style.opacity = "0";
  }

  function _highlightCountryLines(code) {
    if (!_countryLines) return;
    if (_viewMode === "map") {
      _countryLines.visible = true;
    }
    _countryLines.children.forEach(function (group) {
      const isSelected = group.userData.code === code;
      group.children.forEach(function (line) {
        if (line.material) {
          if (isSelected) {
            line.visible = true;
            line.material.color.setHex(HIGHLIGHT_COLOR);
            line.material.opacity = 1.0;
          } else {
            if (_viewMode === "map") {
              line.visible = false;
            } else {
              line.visible = true;
              line.material.color.setHex(DEFAULT_BORDER_COLOR);
              line.material.opacity = 0.55;
            }
          }
        }
      });
    });
  }

  function _clearHighlight() {
    if (_highlightMesh && _earth) {
      _earth.remove(_highlightMesh);
      _highlightMesh.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
          else obj.material.dispose();
        }
      });
      _highlightMesh = null;
    }
    if (!_countryLines) return;
    if (_viewMode === "map") {
      _countryLines.visible = false;
    }
    _countryLines.children.forEach(function (group) {
      group.children.forEach(function (line) {
        if (line.material) {
          line.visible = true;
          line.material.color.setHex(DEFAULT_BORDER_COLOR);
          line.material.opacity = 0.55;
        }
      });
    });
    _selectedCountryCode = null;
  }

  // ── PRIVATE: Globe Rotation to Country ────────────────────────────────
  function _rotateToLatLng(lat, lng) {
    if (!_earth) return;
    // Target rotation so the country faces the camera
    const targetX = -(lat * Math.PI / 180);
    const targetY = -(lng * Math.PI / 180) - Math.PI / 2;

    // Smooth lerp
    const startX = _earth.rotation.x;
    const startY = _earth.rotation.y;
    let t = 0;
    const step = function () {
      t += 0.04;
      if (t > 1) return;
      _earth.rotation.x = startX + (targetX - startX) * _easeInOut(t);
      _earth.rotation.y = startY + (targetY - startY) * _easeInOut(t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ── PRIVATE: Animation Loop ───────────────────────────────────────────
  function _animate() {
    _animFrameId = requestAnimationFrame(_animate);

    // Auto-rotate (gentle spin)
    if (_autoRotate && _earth && !_isDragging) {
      _earth.rotation.y += 0.0008;
    }

    // Apply inertia
    if (!_isDragging && _earth) {
      _rotationVelocity.x *= 0.93;
      _rotationVelocity.y *= 0.93;
      if (Math.abs(_rotationVelocity.x) > 0.0001 || Math.abs(_rotationVelocity.y) > 0.0001) {
        _earth.rotation.x += _rotationVelocity.x;
        _earth.rotation.y += _rotationVelocity.y;
        _clampEarthTilt();
      }
    }

    if (_renderer && _scene && _camera) _renderer.render(_scene, _camera);
  }

  function _onWindowResize() {
    if (!_container || !_camera || !_renderer) return;
    const w = _container.clientWidth || _container.offsetWidth;
    const h = _container.clientHeight || _container.offsetHeight;
    if (w === 0 || h === 0) return;
    _camera.aspect = w / h;
    _camera.updateProjectionMatrix();
    _renderer.setSize(w, h);
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // ── PRIVATE: Country Panel ─────────────────────────────────────────────
  function showCountryPanel(code) {
    if (typeof window.toggleGlobeControls === "function") {
      window.toggleGlobeControls(false);
    }
    const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
    const panel = document.getElementById("globe-country-panel");
    if (!panel) return;

    const lang = (window.geoI18n && window.geoI18n.getLang()) || "vi";
    const t = window.t || function (k, fb) { return fb; };

    const pop = window.getCountryPopulation ? window.getCountryPopulation(code, _currentYear) : 0;
    const gdp = window.getCountryGDP ? window.getCountryGDP(code, _currentYear) : 0;
    const fmtPop = window.formatPopulation ? window.formatPopulation(pop, lang) : pop;
    const name = data ? (data.name[lang] || data.name.en) : code;
    const capital = data ? (data.capital[lang] || data.capital.en) : "-";
    const density = (data && data.area && pop) ? Math.round(pop / data.area) : "-";
    const flagSrc = data ? (data.flagSvgUrl || data.flagSvg || "") : "";
    const growth = data ? (data.gdpGrowth !== undefined ? data.gdpGrowth : (data.growthRate !== undefined ? data.growthRate : null)) : null;

    panel.innerHTML = `
      <div class="globe-panel-header">
        <div class="globe-panel-title-row">
          <img class="globe-flag-img" src="${flagSrc}" alt="${name}" onerror="this.style.display='none'">
          <div>
            <h2 class="globe-panel-country-name">${name}</h2>
            <span class="globe-panel-region">${data ? data.region : ""} &middot; ${data ? data.subregion : ""}</span>
          </div>
        </div>
        <button class="globe-panel-close-btn" onclick="GlobeEngine.hideCountryPanel()" aria-label="Close">&times;</button>
      </div>

      <div class="globe-panel-tabs">
        <button class="globe-tab-btn active" onclick="GlobeEngine.switchPanelTab('overview', this)" data-i18n="globePanelOverview">${t("globePanelOverview", "Tong Quan")}</button>
        <button class="globe-tab-btn" onclick="GlobeEngine.switchPanelTab('economy', this)" data-i18n="globePanelEconomy">${t("globePanelEconomy", "Kinh Te")}</button>
        <button class="globe-tab-btn" onclick="GlobeEngine.switchPanelTab('demographics', this)" data-i18n="globePanelDemo">${t("globePanelDemo", "Dan So")}</button>
        <button class="globe-tab-btn" onclick="GlobeEngine.switchPanelTab('map', this)" data-i18n="globePanelMap">${t("globePanelMap", "Ban Do")}</button>
      </div>

      <div id="globe-tab-overview" class="globe-tab-content active">
        <div class="globe-stat-grid">
          <div class="globe-stat-card">
            <span class="globe-stat-label" data-i18n="globeFieldCapital">${t("globeFieldCapital", "Thu Do")}</span>
            <span class="globe-stat-value">${capital}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label" data-i18n="globeFieldPopulation">${t("globeFieldPopulation", "Dan So")} (${_currentYear})</span>
            <span class="globe-stat-value">${fmtPop}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label" data-i18n="globeFieldArea">${t("globeFieldArea", "Dien Tich")}</span>
            <span class="globe-stat-value">${data && data.area ? data.area.toLocaleString() : "-"} km&sup2;</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label" data-i18n="globeFieldDensity">${t("globeFieldDensity", "Mat Do Dan So")}</span>
            <span class="globe-stat-value">${density} ${t("globePerKm2", "nguoi/km2")}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeFieldUrban", "Do Thi Hoa")}</span>
            <span class="globe-stat-value">${data && data.urbanRate !== undefined ? data.urbanRate + "%" : "-"}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeFieldLifeExp", "Tuoi Tho")}</span>
            <span class="globe-stat-value">${data && data.lifeExpectancy ? data.lifeExpectancy + " " + t("globeYears", "tuoi") : "-"}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeFieldCurrency", "Tien Te")}</span>
            <span class="globe-stat-value">${data && data.currency ? data.currency : "-"}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeFieldPhone", "Ma Vung")}</span>
            <span class="globe-stat-value">${data && data.phone ? data.phone : "-"}</span>
          </div>
        </div>
        ${_renderAdminEditBtn(code)}
      </div>

      <div id="globe-tab-economy" class="globe-tab-content" style="display:none;">
        <div class="globe-stat-grid">
          <div class="globe-stat-card globe-stat-wide">
            <span class="globe-stat-label">${t("globeFieldGDP", "GDP")} (${_currentYear})</span>
            <span class="globe-stat-value globe-gdp-value">${gdp} ${t("globeBillionUSD", "ty USD")}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeGDPPerCapita", "GDP/Dau Nguoi")}</span>
            <span class="globe-stat-value">$${data && data.gdpPerCapita ? ((data.gdpPerCapita[_currentYear] || Object.values(data.gdpPerCapita).slice(-1)[0]) || "-").toLocaleString() : "-"}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeGDPGrowth", "Tang Truong GDP")}</span>
            <span class="globe-stat-value ${growth !== null && growth >= 0 ? "globe-positive" : "globe-negative"}">${growth !== null ? (growth >= 0 ? "+" : "") + growth + "%" : "-"}</span>
          </div>
        </div>
        <div class="globe-sector-title">${t("globeSectors", "Co Cau Kinh Te")}</div>
        <div class="globe-sector-bars">
          ${_renderSectorBars(data, lang)}
        </div>
        <canvas id="globe-gdp-chart" class="globe-chart-canvas" width="320" height="140"></canvas>
      </div>

      <div id="globe-tab-demographics" class="globe-tab-content" style="display:none;">
        <div class="globe-stat-grid">
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeMedianAge", "Tuoi Trung Vi")}</span>
            <span class="globe-stat-value">${data ? data.medianAge : "-"}</span>
          </div>
          <div class="globe-stat-card">
            <span class="globe-stat-label">${t("globeFieldUrban", "Ti Le Do Thi")}</span>
            <span class="globe-stat-value">${data ? data.urbanRate + "%" : "-"}</span>
          </div>
        </div>
        <div class="globe-age-title">${t("globeAgeStructure", "Co Cau Tuoi")}</div>
        <div class="globe-age-bars">
          ${_renderAgeBars(data)}
        </div>
        <canvas id="globe-age-chart" class="globe-chart-canvas" width="280" height="200"></canvas>
      </div>

      <div id="globe-tab-map" class="globe-tab-content" style="display:none;">
        <div id="globe-leaflet-map" class="globe-leaflet-container"></div>
        <div class="globe-map-hint">${t("globeMapHint", "Ban do tinh/thanh. Cuon chuot de phong to.")}</div>
      </div>
    `;

    panel.classList.add("open");

    // Render GDP chart after DOM insertion
    setTimeout(function () {
      _renderGdpChart(code);
      _renderAgeChart(data);
    }, 50);
  }

  function hideCountryPanel() {
    const panel = document.getElementById("globe-country-panel");
    if (panel) panel.classList.remove("open");
    _clearHighlight();
    _selectedCountryCode = null;
  }

  function switchPanelTab(tab, btn) {
    document.querySelectorAll(".globe-tab-content").forEach(function (el) {
      el.style.display = "none";
      el.classList.remove("active");
    });
    document.querySelectorAll(".globe-tab-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    const content = document.getElementById("globe-tab-" + tab);
    if (content) { content.style.display = "block"; content.classList.add("active"); }
    if (btn) btn.classList.add("active");

    // Lazy-load Leaflet map
    if (tab === "map" && _selectedCountryCode) {
      _initLeafletMap(_selectedCountryCode);
    }
    // Re-render charts
    if (tab === "economy" && _selectedCountryCode) {
      setTimeout(function () { _renderGdpChart(_selectedCountryCode); }, 50);
    }
    if (tab === "demographics" && _selectedCountryCode) {
      const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[_selectedCountryCode];
      setTimeout(function () { _renderAgeChart(data); }, 50);
    }
  }

  function _refreshCountryPanel(code) {
    if (document.getElementById("globe-country-panel").classList.contains("open")) {
      showCountryPanel(code);
    }
  }

  function _renderAdminEditBtn(code) {
    const isAdmin = window.geoAuth && (window.geoAuth.isAdmin() || (window.geoAuth.isDeveloper && window.geoAuth.isDeveloper()));
    if (!isAdmin) return "";
    const t = window.t || function (k, fb) { return fb; };
    return `<div class="globe-admin-edit-row">
      <button class="btn btn-sm btn-warning globe-admin-edit-btn" onclick="openGlobeEditModal('${code}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        ${t("globeBtnEdit", "Chinh sua so lieu")}
      </button>
    </div>`;
  }

  function _renderSectorBars(data, lang) {
    if (!data) return "";
    let sectors = null;
    if (data.sectors) {
      sectors = (lang === "vi" && data.sectors.vi) ? data.sectors.vi : (data.sectors.en || data.sectors.vi);
    } else if (data.mainSectorsEn) {
      sectors = (lang === "vi" && data.mainSectors) ? data.mainSectors : data.mainSectorsEn;
    } else if (data.mainSectors) {
      sectors = data.mainSectors;
    }
    if (!sectors || !Array.isArray(sectors)) return "";
    const colors = ["#22c55e", "#3b82f6", "#f59e0b"];
    return sectors.map(function (s, i) {
      const match = s.match(/(\d+(?:\.\d+)?)%/);
      const pct = match ? parseFloat(match[1]) : 0;
      return `<div class="globe-sector-bar-row">
        <span class="globe-sector-name">${s.split(":")[0]}</span>
        <div class="globe-sector-bar-wrap">
          <div class="globe-sector-bar" style="width:${Math.min(100, pct)}%;background:${colors[i] || "#64748b"};"></div>
        </div>
        <span class="globe-sector-pct">${pct}%</span>
      </div>`;
    }).join("");
  }

  function _renderAgeBars(data) {
    const ageObj = data ? (data.ageStructure || data.demographics) : null;
    if (!data || !ageObj) return "";
    const groups = [
      { key: "0-14", color: "#4ade80", label: "0-14" },
      { key: "15-64", color: "#60a5fa", label: "15-64" },
      { key: "65+", color: "#f87171", label: "65+" }
    ];
    return groups.map(function (g) {
      const pct = ageObj[g.key] || 0;
      return `<div class="globe-sector-bar-row">
        <span class="globe-sector-name">${g.label}</span>
        <div class="globe-sector-bar-wrap">
          <div class="globe-sector-bar" style="width:${pct}%;background:${g.color};"></div>
        </div>
        <span class="globe-sector-pct">${pct}%</span>
      </div>`;
    }).join("");
  }

  function _renderGdpChart(code) {
    const canvas = document.getElementById("globe-gdp-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
    if (!data || !data.gdp) return;

    const years = Object.keys(data.gdp).map(Number).sort();
    const values = years.map(function (y) { return data.gdp[y]; });
    const maxVal = Math.max.apply(null, values);

    const w = canvas.width, h = canvas.height;
    const pad = { l: 46, r: 14, t: 12, b: 28 };
    const chartW = w - pad.l - pad.r;
    const chartH = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.roundRect ? ctx.roundRect(0, 0, w, h, 8) : ctx.fillRect(0, 0, w, h);
    ctx.fill();

    // Bars
    const barW = Math.floor(chartW / years.length * 0.6);
    const gap = Math.floor(chartW / years.length);

    years.forEach(function (year, i) {
      const val = data.gdp[year];
      const barH = Math.round((val / maxVal) * chartH);
      const x = pad.l + i * gap + (gap - barW) / 2;
      const y = pad.t + chartH - barH;

      // Gradient bar
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, "#22d3ee");
      grad.addColorStop(1, "#0891b2");
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, 3); else ctx.rect(x, y, barW, barH);
      ctx.fill();

      // Year label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Inter,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(year, x + barW / 2, h - pad.b + 14);
    });

    // Value axis labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Inter,sans-serif";
    ctx.textAlign = "right";
    const numTicks = 4;
    for (let i = 0; i <= numTicks; i++) {
      const val = (maxVal * i / numTicks);
      const y = pad.t + chartH - (val / maxVal) * chartH;
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "T" : val.toFixed(0), pad.l - 4, y + 4);
      ctx.strokeStyle = "rgba(148,163,184,0.1)";
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    }
  }

  function _renderAgeChart(data) {
    const canvas = document.getElementById("globe-age-chart");
    const ageObj = data ? (data.ageStructure || data.demographics) : null;
    if (!canvas || !data || !ageObj) return;
    const ctx = canvas.getContext("2d");

    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(15,23,42,0.7)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 - 10, r = Math.min(w, h) / 2 - 30;
    const slices = [
      { label: "0-14", val: ageObj["0-14"] || 0, color: "#4ade80" },
      { label: "15-64", val: ageObj["15-64"] || 0, color: "#60a5fa" },
      { label: "65+", val: ageObj["65+"] || 0, color: "#f87171" }
    ];
    const total = slices.reduce(function (s, x) { return s + x.val; }, 0);

    let startAngle = -Math.PI / 2;
    slices.forEach(function (s) {
      const sweep = (s.val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const midAngle = startAngle + sweep / 2;
      const lx = cx + (r * 0.65) * Math.cos(midAngle);
      const ly = cy + (r * 0.65) * Math.sin(midAngle);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Inter,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.val + "%", lx, ly);

      startAngle += sweep;
    });

    // Legend
    slices.forEach(function (s, i) {
      const ly = cy + r + 18 + i * 16;
      ctx.fillStyle = s.color;
      ctx.fillRect(cx - 60, ly - 6, 12, 12);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter,sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(s.label + ": " + s.val + "%", cx - 44, ly);
    });
  }

  // ── PRIVATE: Leaflet Map ───────────────────────────────────────────────
  let _leafletMap = null;

  function _initLeafletMap(code) {
    const el = document.getElementById("globe-leaflet-map");
    if (!el) return;

    const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
    if (!data) return;

    // Lazy-load Leaflet if not present
    if (typeof L === "undefined") {
      _loadScript("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js", function () {
        _createLeafletMap(el, data);
      });
    } else {
      _createLeafletMap(el, data);
    }
  }

  function _createLeafletMap(el, data) {
    // Destroy previous map instance if any
    if (_leafletMap) {
      try { _leafletMap.remove(); } catch (e) { }
      _leafletMap = null;
    }

    el.innerHTML = "";
    el.style.height = "260px";

    setTimeout(function () {
      try {
        _leafletMap = L.map(el, { zoomControl: true, scrollWheelZoom: true });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18
        }).addTo(_leafletMap);

        // Zoom to country bounding box using lat/lng centroid
        const lat = data.lat, lng = data.lng;
        _leafletMap.setView([lat, lng], _getZoomForCountry(data.area));

        // Add a marker at capital
        if (data.capital && data.capital.en) {
          L.marker([lat, lng]).addTo(_leafletMap)
            .bindPopup("<b>" + (data.capital.vi || data.capital.en) + "</b>")
            .openPopup();
        }

        setTimeout(function () { _leafletMap.invalidateSize(); }, 200);
      } catch (e) {
        el.innerHTML = "<div style='padding:16px;color:#94a3b8'>Khong the tai ban do. Kiem tra ket noi mang.</div>";
      }
    }, 50);
  }

  function _getZoomForCountry(area) {
    if (!area) return 4;
    if (area > 5000000) return 2;
    if (area > 1000000) return 3;
    if (area > 200000) return 4;
    if (area > 50000) return 5;
    if (area > 5000) return 6;
    return 8;
  }

  // ── PRIVATE: Political Map Texture ────────────────────────────────────
  function _createPoliticalTexture(world) {
    const W = 4096, H = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Ocean background
    ctx.fillStyle = "#0d3b6e";
    ctx.fillRect(0, 0, W, H);

    // Ocean grid lines (latitude/longitude)
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = (lon + 180) / 360 * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = (90 - lat) / 180 * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!window.topojson) return new THREE.CanvasTexture(canvas);
    const countries = topojson.feature(world, world.objects.countries);

    // Helper: convert geo coord to canvas pixel
    function toXY(coord) {
      return [
        (coord[0] + 180) / 360 * W,
        (90 - coord[1]) / 180 * H
      ];
    }

    // Draw filled countries
    countries.features.forEach(function (feature) {
      const code = _numericToAlpha3(feature.id);
      const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
      const region = data ? data.region : null;
      const rc = region && REGION_COLORS[region] ? REGION_COLORS[region] : null;
      const fillColor = rc ? rc.css : REGION_CSS_FALLBACK;
      const strokeColor = rc ? rc.dark : "#374151";

      const geom = feature.geometry;
      const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];

      polygons.forEach(function (polygon) {
        polygon.forEach(function (ring) {
          ctx.beginPath();
          ring.forEach(function (coord, i) {
            const p = toXY(coord);
            if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
          });
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
        });
      });

      // Stroke borders
      polygons.forEach(function (polygon) {
        polygon.forEach(function (ring) {
          ctx.beginPath();
          ring.forEach(function (coord, i) {
            const p = toXY(coord);
            if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
          });
          ctx.closePath();
          ctx.strokeStyle = "rgba(255,255,255,0.45)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });
      });
    });

    // Draw country code labels on canvas (small, for context)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    countries.features.forEach(function (feature) {
      const code = _numericToAlpha3(feature.id);
      const data = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
      if (!data) return;
      const cx = (data.lng + 180) / 360 * W;
      const cy = (90 - data.lat) / 180 * H;
      const area = data.area || 0;
      if (area < 50000) return; // skip tiny countries
      ctx.font = area > 1000000 ? "bold 22px sans-serif" : area > 200000 ? "16px sans-serif" : "11px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      const name = (data.name && (data.name.vi || data.name.en)) || code;
      ctx.strokeText(name, cx, cy);
      ctx.fillText(name, cx, cy);
    });

    return new THREE.CanvasTexture(canvas);
  }

  // ── PRIVATE: Capital City Markers ─────────────────────────────────────
  function _createCapitalMarkers() {
    if (_capitalGroup) {
      if (_earth) _earth.remove(_capitalGroup);
      _capitalGroup = null;
    }
    if (!window.GLOBE_COUNTRY_DATA) return;

    _capitalGroup = new THREE.Group();
    _capitalGroup.name = "capitalMarkers";

    for (var code in window.GLOBE_COUNTRY_DATA) {
      var data = window.GLOBE_COUNTRY_DATA[code];
      if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") continue;
      var capital = (data.capital && (data.capital.vi || data.capital.en)) || "";
      if (!capital) continue;

      var sprite = _makeCapitalSprite(capital, data.region);
      var pos = _latLngToVector3(data.lat, data.lng, _earthRadius + 0.018);
      sprite.position.copy(pos);

      // Scale based on country size for importance
      var area = data.area || 0;
      var s = area > 1000000 ? 0.22 : area > 200000 ? 0.16 : area > 50000 ? 0.12 : 0.09;
      sprite.scale.set(s * 3.2, s, 1);
      sprite.userData.code = code;
      _capitalGroup.add(sprite);
    }

    if (_earth) {
      _earth.add(_capitalGroup);
      _capitalGroup.visible = (_viewMode === "map");
    }
  }

  function _makeCapitalSprite(label, region) {
    var W = 320, H = 72;
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var ctx = c.getContext("2d");

    var rc = region && REGION_COLORS[region] ? REGION_COLORS[region] : null;
    var dotColor = rc ? rc.css : "#94a3b8";

    // Dot
    ctx.beginPath();
    ctx.arc(20, H / 2, 7, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label background
    ctx.font = "bold 22px Inter,Arial,sans-serif";
    var tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(5,10,30,0.75)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(32, H / 2 - 16, tw + 12, 32, 6);
    else ctx.rect(32, H / 2 - 16, tw + 12, 32);
    ctx.fill();

    // Label text
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 38, H / 2);

    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Sprite(mat);
  }

  // ── PUBLIC: View Mode Toggle ───────────────────────────────────────────
  function setViewMode(mode) {
    if (mode !== "satellite" && mode !== "map") return;
    _viewMode = mode;
    if (!_earth || !_earthMaterial) return;

    if (mode === "satellite") {
      _applySatelliteMode();
    } else {
      _applyMapMode();
    }
  }

  function _applySatelliteMode() {
    if (!_earthMaterial) return;
    _earthMaterial.map = _satelliteTexDay;
    _earthMaterial.color.set(0xffffff);
    _earthMaterial.emissiveMap = _satelliteTexNight || null;
    _earthMaterial.emissive.set(0x223366);
    _earthMaterial.emissiveIntensity = 0.4;
    _earthMaterial.needsUpdate = true;
    if (_capitalGroup) _capitalGroup.visible = false;
    if (_countryLines) {
      _countryLines.visible = true;
      _countryLines.children.forEach(function (group) {
        group.children.forEach(function (line) {
          if (line.material) {
            line.visible = true;
            line.material.color.setHex(DEFAULT_BORDER_COLOR);
            line.material.opacity = 0.55;
            line.material.needsUpdate = true;
          }
        });
      });
    }
    if (_sunLight) _sunLight.intensity = 2.5;
  }

  function _applyMapMode() {
    if (!_earthMaterial) return;
    var cached = _mapTheme === "dark" ? _mapTexDark : _mapTexLight;

    if (!cached) {
      if (_countriesGeoJSON && window.topojson) {
        if (_mapTheme === "dark") _mapTexDark = _generatePoliticalMapTexture("dark");
        else _mapTexLight = _generatePoliticalMapTexture("light");
        _applyMapTextureNow();
      } else {
        // Fallback ocean background while loading
        _earthMaterial.map = null;
        _earthMaterial.color.set(_mapTheme === "dark" ? 0x080e1a : 0x0284c7);
        _earthMaterial.emissiveMap = null;
        _earthMaterial.emissive.set(0x000000);
        _earthMaterial.emissiveIntensity = 0;
        _earthMaterial.needsUpdate = true;
        _loadCountryBorders();
      }
    } else {
      _applyMapTextureNow();
    }
  }

  function _applyMapTextureNow() {
    var tex = _mapTheme === "dark" ? _mapTexDark : _mapTexLight;
    if (!_earthMaterial || !tex) return;
    tex.needsUpdate = true;
    _earthMaterial.map = tex;
    _earthMaterial.color.set(0xffffff);
    _earthMaterial.emissiveMap = tex;
    _earthMaterial.emissive.set(0xffffff);
    _earthMaterial.emissiveIntensity = _mapTheme === "dark" ? 0.35 : 0.75;
    _earthMaterial.needsUpdate = true;
    if (_capitalGroup) _capitalGroup.visible = true;
    if (_countryLines) {
      _countryLines.visible = true;
      _countryLines.children.forEach(function (group) {
        const isSelected = group.userData.code === _selectedCountryCode;
        group.children.forEach(function (line) {
          if (line.material) {
            line.visible = true;
            line.material.color.setHex(isSelected ? HIGHLIGHT_COLOR : (_mapTheme === "dark" ? 0x64748b : 0xffffff));
            line.material.opacity = isSelected ? 1.0 : (_mapTheme === "dark" ? 0.45 : 0.65);
            line.material.needsUpdate = true;
          }
        });
      });
    }
    if (_sunLight) _sunLight.intensity = _mapTheme === "dark" ? 0.8 : 1.2;
  }

  function setMapTheme(theme) {
    if (theme !== "light" && theme !== "dark") return;
    _mapTheme = theme;
    if (_viewMode === "map") _applyMapMode();
  }

  function getViewMode()  { return _viewMode; }
  function getMapTheme()  { return _mapTheme; }

  // ── PRIVATE: Country Explorer UI & Search ──────────────────────────────
  let _activeRegionFilter = "all";

  function onSearchInput(val) {
    const clearBtn = document.getElementById("globe-search-clear");
    if (clearBtn) clearBtn.style.display = val ? "inline-block" : "none";
    _renderSearchDropdown(val, _activeRegionFilter);
  }

  function onSearchFocus() {
    const input = document.getElementById("globe-search-input");
    const val = input ? input.value : "";
    _renderSearchDropdown(val, _activeRegionFilter);
  }

  function clearSearch() {
    const input = document.getElementById("globe-search-input");
    if (input) input.value = "";
    const clearBtn = document.getElementById("globe-search-clear");
    if (clearBtn) clearBtn.style.display = "none";
    const dropdown = document.getElementById("globe-search-dropdown");
    if (dropdown) dropdown.style.display = "none";
  }

  function filterRegion(region, btn) {
    _activeRegionFilter = region;
    document.querySelectorAll(".globe-pill-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    if (btn) btn.classList.add("active");
    const input = document.getElementById("globe-search-input");
    const val = input ? input.value : "";
    _renderSearchDropdown(val, region);
  }

  function _renderSearchDropdown(query, region) {
    const dropdown = document.getElementById("globe-search-dropdown");
    if (!dropdown || !window.GLOBE_COUNTRY_DATA) return;

    const q = (query || "").trim().toLowerCase();
    const lang = (window.geoI18n && window.geoI18n.getLang()) || "vi";

    const matches = [];
    for (const code in window.GLOBE_COUNTRY_DATA) {
      const c = window.GLOBE_COUNTRY_DATA[code];
      if (region && region !== "all" && c.region !== region) continue;

      if (!q) {
        matches.push(c);
        if (matches.length >= 35) break;
        continue;
      }

      const nameVi = (c.name.vi || "").toLowerCase();
      const nameEn = (c.name.en || "").toLowerCase();
      const capVi  = (c.capital && c.capital.vi ? c.capital.vi : "").toLowerCase();
      const capEn  = (c.capital && c.capital.en ? c.capital.en : "").toLowerCase();
      const iso    = code.toLowerCase();

      if (nameVi.includes(q) || nameEn.includes(q) || iso.includes(q) || capVi.includes(q) || capEn.includes(q)) {
        matches.push(c);
        if (matches.length >= 35) break;
      }
    }

    if (matches.length === 0) {
      dropdown.innerHTML = '<div style="padding:12px;color:#64748b;font-size:0.8rem;text-align:center;">Khong tim thay quoc gia phu hop</div>';
      dropdown.style.display = "block";
      return;
    }

    dropdown.innerHTML = matches.map(function (c) {
      const name = c.name[lang] || c.name.en || c.code;
      const sub = (lang === "vi" ? c.name.en : c.name.vi) || c.region;
      return `<div class="globe-dropdown-item" onclick="GlobeEngine.selectCountry('${c.code}')">
        <img class="globe-dropdown-flag" src="${c.flagSvgUrl || c.flagSvg || ''}" alt="${name}" onerror="this.style.display='none'">
        <div class="globe-dropdown-info">
          <span class="globe-dropdown-name">${name}</span>
          <span class="globe-dropdown-sub">${sub} &middot; ${c.region}</span>
        </div>
        <span class="globe-dropdown-code">${c.code}</span>
      </div>`;
    }).join("");

    dropdown.style.display = "block";
  }

  function _syncCountrySelectorUI(code) {
    const c = window.GLOBE_COUNTRY_DATA && window.GLOBE_COUNTRY_DATA[code];
    if (!c) return;
    const lang = (window.geoI18n && window.geoI18n.getLang()) || "vi";
    const name = c.name[lang] || c.name.en || code;

    const input = document.getElementById("globe-search-input");
    if (input) input.value = name;
    const clearBtn = document.getElementById("globe-search-clear");
    if (clearBtn) clearBtn.style.display = "inline-block";

    const dropdown = document.getElementById("globe-search-dropdown");
    if (dropdown) dropdown.style.display = "none";

    if (c.region) {
      document.querySelectorAll(".globe-pill-btn").forEach(function (b) {
        if (b.getAttribute("data-region") === c.region) {
          b.classList.add("active");
          _activeRegionFilter = c.region;
        } else if (b.getAttribute("data-region") !== "all") {
          b.classList.remove("active");
        }
      });
    }
  }

  function selectCountry(code) {
    if (!window.GLOBE_COUNTRY_DATA || !window.GLOBE_COUNTRY_DATA[code]) return;
    const c = window.GLOBE_COUNTRY_DATA[code];
    _rotateToLatLng(c.lat, c.lng);
    _selectCountry(code);
  }

  // Click-outside listener to dismiss search dropdown
  document.addEventListener("click", function (e) {
    const bar = document.getElementById("globe-search-bar");
    const dropdown = document.getElementById("globe-search-dropdown");
    if (bar && dropdown && !bar.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  // ── PUBLIC API EXPORT ──────────────────────────────────────────────────
  return {
    init: init,
    destroy: destroy,
    setDayNight: setDayNight,
    setYear: setYear,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    resetView: resetView,
    focusCountry: focusCountry,
    selectCountry: selectCountry,
    showCountryPanel: showCountryPanel,
    hideCountryPanel: hideCountryPanel,
    switchPanelTab: switchPanelTab,
    getSelectedYear: getSelectedYear,
    isInitialized: isInitialized,
    setViewMode: setViewMode,
    getViewMode: getViewMode,
    setMapTheme: setMapTheme,
    getMapTheme: getMapTheme,
    onSearchInput: onSearchInput,
    onSearchFocus: onSearchFocus,
    clearSearch: clearSearch,
    filterRegion: filterRegion
  };
})();

window.GlobeEngine = GlobeEngine;
