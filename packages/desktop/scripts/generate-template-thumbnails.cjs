/**
 * Generate thumbnails for built-in templates
 *
 * This script uses Playwright to render each built-in template in a headless
 * browser using Three.js, captures the canvas, and writes the base64 thumbnail
 * data to a separate thumbnails.json file that the app loads.
 *
 * Templates are loaded from the JSON definition files in:
 *   src/renderer/src/templates/data/*.template.json
 *
 * Usage: npm run generate:thumbnails
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

// Path to template JSON files
const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'renderer', 'src', 'templates', 'data');

/**
 * Load all template definitions from JSON files
 */
function loadTemplates() {
  const templateFiles = fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.template.json'));

  return templateFiles.map(filename => {
    const filePath = path.join(TEMPLATES_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    return {
      id: data.id,
      filename: filename,
      name: data.name,
      // Extract just the data needed for rendering
      parts: data.parts.map(p => ({
        length: p.length,
        width: p.width,
        thickness: p.thickness,
        position: p.position,
        rotation: p.rotation,
        color: p.color
      }))
    };
  });
}

/**
 * Load all assembly definitions from JSON files
 */
function loadAssemblies() {
  const assemblyFiles = fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.assembly.json'));

  return assemblyFiles.map(filename => {
    const filePath = path.join(TEMPLATES_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    return {
      id: data.id,
      filename: filename,
      name: data.name,
      // Extract just the data needed for rendering (using relativePosition as position)
      parts: data.parts.map(p => ({
        length: p.length,
        width: p.width,
        thickness: p.thickness,
        position: p.relativePosition,
        rotation: p.rotation,
        color: p.color
      }))
    };
  });
}

// HTML template with inline Three.js renderer
function generateRendererHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #1a1a1a; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.169.0/build/three.module.js"
      }
    }
  </script>
  <script type="module">
    import * as THREE from 'three';

    const THUMBNAIL_WIDTH = ${THUMBNAIL_WIDTH};
    const THUMBNAIL_HEIGHT = ${THUMBNAIL_HEIGHT};

    // Set up scene - use same background as app canvas (#1a1a1a)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Set up camera
    const camera = new THREE.PerspectiveCamera(45, THUMBNAIL_WIDTH / THUMBNAIL_HEIGHT, 0.1, 1000);

    // Set up renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    renderer.setPixelRatio(1);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, 50, -50);
    scene.add(fillLight);

    // Function to create a part mesh
    function createPartMesh(part) {
      const geometry = new THREE.BoxGeometry(part.length, part.thickness, part.width);
      const material = new THREE.MeshStandardMaterial({
        color: part.color,
        roughness: 0.7,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(part.position.x, part.position.y, part.position.z);

      // Apply rotation (convert degrees to radians)
      if (part.rotation) {
        mesh.rotation.x = (part.rotation.x || 0) * Math.PI / 180;
        mesh.rotation.y = (part.rotation.y || 0) * Math.PI / 180;
        mesh.rotation.z = (part.rotation.z || 0) * Math.PI / 180;
      }

      return mesh;
    }

    // Function to render parts and capture
    window.renderAndCapture = function(parts) {
      // Clear existing meshes
      while(scene.children.length > 3) { // Keep lights
        scene.remove(scene.children[scene.children.length - 1]);
      }

      // Add parts
      const group = new THREE.Group();
      parts.forEach(part => {
        group.add(createPartMesh(part));
      });
      scene.add(group);

      // Calculate bounding box and center camera
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Position camera to frame the object nicely (isometric-ish view)
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
      cameraDistance *= 1.8; // Add some padding

      camera.position.set(
        center.x + cameraDistance * 0.7,
        center.y + cameraDistance * 0.5,
        center.z + cameraDistance * 0.7
      );
      camera.lookAt(center);

      // Render
      renderer.render(scene, camera);

      // Capture
      const dataUrl = renderer.domElement.toDataURL('image/png');
      return dataUrl.split(',')[1]; // Return just the base64 data
    };

    // Signal that we're ready
    window.rendererReady = true;
  </script>
</body>
</html>`;
}

async function generateThumbnails() {
  console.log('🎨 Generating thumbnails for built-in templates and assemblies...\n');

  // Load templates and assemblies from JSON files
  const templates = loadTemplates();
  const assemblies = loadAssemblies();

  console.log(`📂 Found ${templates.length} templates and ${assemblies.length} assemblies\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Load the renderer HTML
  const html = generateRendererHTML();
  await page.setContent(html);

  // Wait for Three.js to initialize
  await page.waitForFunction(() => window.rendererReady === true, { timeout: 10000 });

  const thumbnails = {
    templates: {},
    assemblies: {}
  };

  // Generate template thumbnails
  console.log('📦 Generating template thumbnails...\n');
  for (const template of templates) {
    console.log(`  🪑 Rendering ${template.name}...`);

    try {
      const base64 = await page.evaluate((parts) => {
        return window.renderAndCapture(parts);
      }, template.parts);

      thumbnails.templates[template.id] = {
        data: base64,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        generatedAt: new Date().toISOString()
      };

      console.log(`     ✅ Generated thumbnail (${Math.round(base64.length / 1024)}KB)`);
    } catch (error) {
      console.error(`     ❌ Failed to generate thumbnail for ${template.name}:`, error.message);
    }
  }

  // Generate assembly thumbnails
  console.log('\n📦 Generating assembly thumbnails...\n');
  for (const assembly of assemblies) {
    console.log(`  🗃️ Rendering ${assembly.name}...`);

    try {
      const base64 = await page.evaluate((parts) => {
        return window.renderAndCapture(parts);
      }, assembly.parts);

      thumbnails.assemblies[assembly.id] = {
        data: base64,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        generatedAt: new Date().toISOString()
      };

      console.log(`     ✅ Generated thumbnail (${Math.round(base64.length / 1024)}KB)`);
    } catch (error) {
      console.error(`     ❌ Failed to generate thumbnail for ${assembly.name}:`, error.message);
    }
  }

  await browser.close();

  // Write thumbnails to a JSON file that can be imported by the app
  const outputPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'templates', 'thumbnails.json');
  fs.writeFileSync(outputPath, JSON.stringify(thumbnails, null, 2));
  console.log(`\n📁 Saved thumbnails to ${outputPath}`);

  console.log('\n✨ Done! Thumbnails have been generated.');
  console.log('   Run the app to see the new thumbnails in action.');
}

generateThumbnails().catch(console.error);
