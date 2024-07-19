import * as THREE from "three"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import { ArcballControls } from "three/addons/controls/ArcballControls.js"

// set Z as default up everywhere
THREE.Object3D.DEFAULT_UP.set(0, 0, 1)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 5, 10000)
camera.position.set(0, -1500, 500)

const controls = new ArcballControls(camera, renderer.domElement)

controls.addEventListener("change", function () {
  renderer.render(scene, camera)
})

const light = new THREE.AmbientLight(1.0)
scene.add(light)

const directionalLight = new THREE.DirectionalLight(0xddd5cc, 1.0)
scene.add(directionalLight)

const objLoader = new OBJLoader()
objLoader.load("./andalsnes-terrain.obj", (object) => {
  // HACK
  object.children[0].geometry.center()
  //
  scene.add(object)
  renderer.render(scene, camera)
})
