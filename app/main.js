import * as THREE from "three"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

// set +Z as our up axis for the entire app
THREE.Object3D.DEFAULT_UP.set(0, 0, 1)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setAnimationLoop(animate)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 5, 10000)
camera.position.set(1500, -500, 700)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(1500, 1500, 0)
controls.update()

const directionalLight = new THREE.DirectionalLight(0xddd5cc, 2.0)
directionalLight.position.set(-0.2, -0.4, 0.9)
scene.add(directionalLight)

const satelliteTexture = new THREE.TextureLoader().load("./andalsnes-satellite.png")

const orthoTexture = new THREE.TextureLoader().load("./andalsnes-ortho.png")
orthoTexture.colorSpace = THREE.SRGBColorSpace

let terrainMesh
let buildingMesh
let roadMesh

const objLoader = new OBJLoader()
objLoader.load("./andalsnes-terrain.obj", (object) => {
  terrainMesh = object.children[0]
  terrainMesh.material.map = satelliteTexture
  scene.add(terrainMesh)
})

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
        objLoader.load("./andalsnes-buildings.obj", (object) => {
          buildingMesh = object.children[0]
          scene.add(buildingMesh)
        })
      } else {
        buildingMesh.visible = !buildingMesh.visible
      }
      break
    case "r":
      if (!roadMesh) {
        objLoader.load("./andalsnes-roads.obj", (object) => {
          roadMesh = object.children[0]
          roadMesh.material.color.set(0x555555)
          scene.add(roadMesh)
        })
      } else {
        roadMesh.visible = !roadMesh.visible
      }
      break
    case "o":
      terrainMesh.material.map = orthoTexture
      break
    case "s":
      terrainMesh.material.map = satelliteTexture
      break
  }
})

function animate() {
  renderer.render(scene, camera)
}
