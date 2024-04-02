import * as THREE from 'three';
import * as d3 from "d3";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from 'dat.gui';

let renderer, scene, camera, textureLoader;
let camFactor = {zoom: 100};
let controls;
let xpos, ypos, zpos, transformList;
let surfaceMesh;
let gridList;
let graphPoint, graphLine;
let pressed = false;
let drawCount = 0;
let ptsExist = false;
let pointList = [];
let lineList = [];
let cnt = 0, grad = false;

const pi = Math.PI;
const gui = new GUI();
const h = 1e-4;
const params = { t : 0 };
const MAX_POINTS = 1000;

const gradButton = document.getElementById('gradDescent');
gradButton.addEventListener('click', () => {
  if (grad) {grad = false; gradButton.innerHTML = 'Start Simulation';}
  else if (ptsExist) {pressed = true; grad = true; gradButton.innerHTML = 'Pause Simulation'}
});

const genButton = document.getElementById('genPoints');
genButton.addEventListener('click', () => {
  drawCount = 0;
  if (ptsExist) erasePoints();
  initPoints();
  ptsExist = true;
});

init();

function init() {
  const canvas = document.querySelector( '.webgl' );

  scene = new THREE.Scene();
  const matSurface = new THREE.MeshStandardMaterial({
    color: 'lightblue', 
    roughness: .5,
    metalness:.02, 
    side: THREE.DoubleSide,
    wireframe: false
  });
  const matSolidLine = new THREE.LineBasicMaterial({
    color: 'blue', 
    transparent: true, 
    opacity: .15, 
  });
  var centerHelper = new THREE.Group()
  var gridHelper = new THREE.Group()
  
  let domain = {  x:[-2, 2],  y:[-2, 2],  z:[-2, 2], ticks:10}
  let xScale = d3.scaleLinear([0, 1], domain.x);
  let yScale = d3.scaleLinear([0, 1], domain.y);
  
  let xRes = 20*10+1
  let yRes = 20*10+1
  let surfaceGeo = new THREE.BufferGeometry();

  // Define arrays to hold vertex positions
  let vertices = [];
  let indices = [];

  // Loop through grid points
  for (let i = 0; i < yRes; i++) {
      for (let j = 0; j < xRes; j++) {
          // Calculate vertex position
          let vertex = new THREE.Vector3(
              yScale(i / (yRes - 1)),
              0,
              xScale(j / (xRes - 1))
          );
          // Add vertex to vertices array
          vertices.push(vertex.x, vertex.y, vertex.z);
          // Calculate indices for triangle faces
          if (i < yRes - 1 && j < xRes - 1) {
              let currentIndex = i * xRes + j;
              let nextIndex = currentIndex + xRes;
              // Define triangle face using indices
              indices.push(
                  currentIndex, currentIndex + 1, nextIndex,
                  currentIndex + 1, nextIndex + 1, nextIndex
              );
          }
      }
  }
  // Set positions attribute for BufferGeometry
  surfaceGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  // Set indices for faces
  surfaceGeo.setIndex(indices);
  surfaceMesh = new THREE.Mesh(surfaceGeo,matSurface)
  gridList = [];
  let ticks = domain.ticks;
  for (let i = 0; i < ticks; i++) {
    const xGeo = new THREE.BufferGeometry();
    const yGeo = new THREE.BufferGeometry();  
    // Define arrays to hold vertex positions
    let xVertices = [];
    let yVertices = [];
    // Populate arrays with vertex positions
    for (let j = 0; j < yRes; j++)
        xVertices.push(yScale(j / (yRes - 1)), 0, xScale(i / (ticks - 1)));
    for (let j = 0; j < xRes; j++)
        yVertices.push(yScale(i / (ticks - 1)), 0, xScale(j / (xRes - 1)));
    // Set positions attribute for BufferGeometry
    xGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(xVertices), 3));
    yGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(yVertices), 3));
    const xLine = new THREE.Line(xGeo, matSolidLine);
    const yLine = new THREE.Line(yGeo, matSolidLine);
    gridList.push(xLine, yLine);
    gridHelper.add(xLine, yLine);
  }

  gridHelper.position.set(0, 0.0005 * Math.abs((domain.y[0] - domain.y[1])), 0);  
  centerHelper.add(surfaceMesh)
  centerHelper.add(gridHelper)
  scene.add(centerHelper)
  centerHelper.scale.set(2/Math.abs(domain.y[0]-domain.y[1]),2/Math.abs(domain.z[0]-domain.z[1]),2/Math.abs(domain.x[0]-domain.x[1]))
  let xMove = -(domain.x[0]+domain.x[1])/Math.abs((domain.x[0]-domain.x[1]))
  let yMove = -(domain.y[0]+domain.y[1])/Math.abs((domain.y[0]-domain.y[1]))  
  let zMove = -(domain.z[0]+domain.z[1])/Math.abs((domain.z[0]-domain.z[1]))  
  centerHelper.position.set(yMove,zMove,xMove)

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  hemiLight.color.setHSL(0.6, 0.6, 0.5);
  hemiLight.groundColor.setHSL(0.095, 0.5, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
  dirLight1.color.setHSL(11 / 18, 0.7, 0.5);
  dirLight1.position.set(Math.sin((1.5 / 3) * pi), 2, Math.cos((2 / 3) * pi));
  dirLight1.position.multiplyScalar(50);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
  dirLight2.color.setHSL(13 / 18, 0.2, 0.5);
  dirLight2.position.set(Math.sin((3.5 / 3) * pi), 1, Math.cos((4 / 3) * pi));
  dirLight2.position.multiplyScalar(50);
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(0xffffff, 1);
  dirLight3.color.setHSL(5 / 6,0.8, 0.5);
  dirLight3.position.set(Math.sin((5.5 / 3) * pi), 1, Math.cos((0 / 3) * pi));
  dirLight3.position.multiplyScalar(50);
  scene.add(dirLight3);
  
  camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, .1, 1000);
  camera.zoom = 6;
  camera.position.set( 10, 10, 10 );
  camera.updateProjectionMatrix();
  scene.add(camera);

  renderer = new THREE.WebGLRenderer( { canvas } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

  // Controls
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target = new THREE.Vector3(0,0.25,0);

  savePoints(surfaceMesh);
  for (let i = 0; i < gridList.length; i++) {
      savePoints(gridList[i]);
  }

  gui.add(params, 't', 0, Math.PI * 3).name('t');
  window.addEventListener( 'resize', onWindowResize );

  animate();
}

function savePoints(mesh) {
  mesh.savedPoints = mesh.geometry.clone();
}

function updateSurface(mesh) {
  const count = mesh.geometry.attributes.position.count;
  const positions = mesh.geometry.attributes.position.array;
  const savedPositions = mesh.savedPoints.attributes.position.array;

  for (let i = 0; i < count; i++) {
      const index = i * 3;
      xpos = savedPositions[index];
      zpos = savedPositions[index + 2]; // y-axis is stored in the second component
      ypos = f(xpos, zpos, params.t); // graph on y-axis (despite variable names)
      transformList = transform(xpos, ypos, zpos, params.t);

      positions[index] = transformList[0];
      positions[index + 1] = transformList[1]; // z-axis is stored in the second component
      positions[index + 2] = transformList[2];
  }

  mesh.geometry.computeVertexNormals();
  mesh.geometry.attributes.position.needsUpdate = true;
}

function erasePoints() {
  for (let i=0;i<pointList.length;i++) {
    pointList[i].geometry.dispose();
    pointList[i].material.dispose();
    lineList[i].geometry.dispose();
    lineList[i].material.dispose();
    scene.remove(pointList[i]);
    scene.remove(lineList[i]);
  }
  pointList = [];
  lineList = [];
}

function initPoints() {
  const pointGeometry = new THREE.SphereGeometry(0.005);
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth:2});
  for (let i=0;i<1000;i++) {
    graphPoint = new THREE.Mesh(pointGeometry, pointMaterial)
    let randX = Math.random()*4-2;
    let randY = Math.random()*4-2;
    pointList.push(graphPoint);

    let points = new Float32Array(MAX_POINTS*3);
    let geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('position', new THREE.BufferAttribute(points,3));
    graphLine = new THREE.Line(geometry, lineMaterial);
    lineList.push(graphLine);
    updateMovingPoint(i,randX,randY);

    scene.add(graphPoint);
    scene.add(graphLine);
  }
}

function updateMovingPoint(i,x,z) {
  let Point = pointList[i];
  const y = f(x,z,params.t)/2; // must halve to touch graph
  Point.position.set(x/2, y+0.005, z/2);

  let Line = lineList[i];
  let positions = Line.geometry.attributes.position.array;
  let index = drawCount*3;
  Line.geometry.setDrawRange(0,drawCount);
  positions[index++] = x/2;
  positions[index++] = y+0.005;
  positions[index] = z/2;
  Line.geometry.attributes.position.needsUpdate = true;
  
  if (Math.abs(x)>2 || Math.abs(z)>2) {
    Point.visible = false; Line.visible = false;
  } else {
    Point.visible = true; Line.visible = true;
  }
}

function gradientDescent() {
  const scale = 2e-3;
  for (let i=0;i<pointList.length;i++) {
    let currPos = pointList[i].position;
    let xPos = currPos.x*2;
    let zPos = currPos.z*2;
    let xGrad = (f(xPos+h,zPos,params.t)-f(xPos,zPos,params.t))/h;
    let zGrad = (f(xPos,zPos+h,params.t)-f(xPos,zPos,params.t))/h;

    let norm = new THREE.Vector2(xGrad,zGrad);
    norm.normalize();
    xGrad = scale*norm.x; zGrad = scale*norm.y;

    updateMovingPoint(i,xPos-xGrad,zPos-zGrad);
  }
}

function transform(x, y, z, t){
  //transform matrix
  let tx = 1*x + 0*y + 0*z
  let ty = 0*x + 1*y + 0*z
  let tz = 0*x + 0*y + 1*z
  return [tx, ty, tz]
}

function f(x, y, t){
  
  // inward ripple wave
  let phase1 = (.5+.5*Math.sin( t/3+0*Math.PI + .5*Math.sqrt(x**2+y**2) ))**2
  let rippleWave = Math.cos(2*t + 25*Math.sqrt(.2+x**2+y**2) ) 
  
  // outward spiral wave
  let phase2 = (.5+.5*Math.sin(t/3+.75*Math.PI - .5*Math.sqrt(x**2+y**2) ))**2
  let spiralWave = (
    Math.cos(                          // wave shape
      -2*t                             // animate
      + 18*Math.sqrt(.2+x**2+y**2)     // outward ripple
      - 2*Math.atan((x+.001)/y)        // spiral ramp
    )
    *(x**2+y**2)/(x**2+y**2+.03)       // smooth roughness near origin
    + 1 - (x**2+y**2)/(x**2+y**2+.03)  // adds a bump so the spiral arms connect
  )
  
  // chaotic inverse wave
  let phase3 = Math.max(0,1-phase1-phase2)
  let inverseWave =  Math.sin(20*(x*y)/Math.sqrt(1+x**2+y**2)-t) 
  
  return .13*phase1*rippleWave + .15*phase2*spiralWave + .2*phase3*inverseWave + .35
}

function onWindowResize() {
  camera.left = window.innerWidth / -camFactor.zoom;
  camera.right = window.innerWidth / camFactor.zoom;
  camera.top = window.innerHeight / camFactor.zoom;
  camera.bottom = window.innerHeight / -camFactor.zoom;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  controls.update();
  render();
  requestAnimationFrame( animate );
}

let interval = 1e-10;
function render() {
  if (pressed) {
    let intervalID = setInterval(() => {
      gradientDescent();
      cnt++;drawCount++;drawCount=drawCount%MAX_POINTS;
      if (cnt === 1000 || !grad) {
          cnt = 0;
          clearInterval(intervalID); 
          grad = false;
          gradButton.innerHTML = 'Start Simulation';
      }
      }, interval);
    pressed = false;
  }

  if (!grad) {
    for (let i=0; i<pointList.length;i++)
      updateMovingPoint(i,2*pointList[i].position.x,2*pointList[i].position.z)
  }
  // t = new Date().getTime() / 1000; // time in seconds
  updateSurface(surfaceMesh);
  for (let i = 0; i < gridList.length; i++) {
    updateSurface(gridList[i]);
  }

  renderer.render( scene, camera );
}