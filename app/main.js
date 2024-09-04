import * as THREE from "three"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js"

const PROJECT_NAME = await getProjectName()

// set +Z as our up axis for the entire app
THREE.Object3D.DEFAULT_UP.set(0, 0, 1)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setAnimationLoop(animate)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 5, 10000)
camera.position.set(1500, -500, 700)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(1500, 1500, 0)
controls.update()

const directionalLight = new THREE.DirectionalLight(0xddd5cc, 2.0)
directionalLight.position.set(-0.2, -0.4, 0.9)
scene.add(directionalLight)

const satelliteTexture = new THREE.TextureLoader().load(`./${PROJECT_NAME}-satellite.png`)

const orthoTexture = new THREE.TextureLoader().load(`./${PROJECT_NAME}-ortho.png`)
orthoTexture.colorSpace = THREE.SRGBColorSpace

let terrainMesh
let buildingMesh
let roadMesh
let attributionText = ""

const objLoader = new OBJLoader()
objLoader.load(
  `./${PROJECT_NAME}-terrain.obj`,
  (object) => {
    terrainMesh = object.children[0]
    terrainMesh.material.map = satelliteTexture
    scene.add(terrainMesh)

    updateAttributions()
  },
  () => {},
  (error) => {
    console.log("Error loading OBJ", error)
  }
)

async function getProjectName() {
  const response = await fetch("/config.json")
  const config = await response.json()
  return config.project_name
}

function exportScene(scene, filename) {
  const exporter = new GLTFExporter()

  exporter.parse(
    scene,
    (glb) => {
      const blob = new Blob([glb], { type: "application/octet-stream" })

      const link = document.createElement("a")
      link.style.display = "none"
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)

      link.click()
      URL.revokeObjectURL(link.href)
    },
    (error) => {
      console.log("Error while exporting scene as GLB", error)
    },
    {
      binary: true,
    }
  )
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener("keydown", (keyboardEvent) => {
  switch (keyboardEvent.key) {
    case "t":
      if (terrainMesh) {
        terrainMesh.visible = !terrainMesh.visible
      }
      break
    case "b":
      if (!buildingMesh) {
        objLoader.load(
          `./${PROJECT_NAME}-buildings.obj`,
          (object) => {
            buildingMesh = object.children[0]
            scene.add(buildingMesh)
            updateAttributions()
          },
          () => {},
          (error) => {
            console.log("Error loading OBJ", error)
          }
        )
      } else {
        buildingMesh.visible = !buildingMesh.visible
        updateAttributions()
      }
      break
    case "r":
      if (!roadMesh) {
        objLoader.load(
          `./${PROJECT_NAME}-roads.obj`,
          (object) => {
            roadMesh = object.children[0]
            roadMesh.material.color.set(0x222222)
            scene.add(roadMesh)
            updateAttributions()
          },
          () => {},
          (error) => {
            console.log("Error loading OBJ", error)
          }
        )
      } else {
        roadMesh.visible = !roadMesh.visible
        updateAttributions()
      }
      break
    case "o":
      terrainMesh.material.map = orthoTexture
      break
    case "s":
      terrainMesh.material.map = satelliteTexture
      break
    case "w":
      terrainMesh.material.wireframe = !terrainMesh.material.wireframe
      break
    case "x":
      exportScene(scene, "scene.glb")
      break
  }
  updateAttributions()
})

function updateAttributions() {
  attributionText = ""
  if (terrainMesh || terrainMesh.material.map == orthoTexture) attributionText += "© Kartverket"
  if ((buildingMesh && buildingMesh.visible) || (roadMesh && roadMesh.visible)) attributionText += " © OpenStreetMap"
  if (terrainMesh.material.map == satelliteTexture) attributionText += " © Copernicus Sentinel-2"

  document.getElementById("attribution").innerText = attributionText
}

function animate() {
  renderer.render(scene, camera)
}
