////////////////  Imports  ////////////////
import { Color, Vector3, MeshLambertMaterial,LineBasicMaterial, MeshBasicMaterial } from "three";
import { IfcViewerAPI, NavigationModes } from "web-ifc-viewer";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import Stats from "three/examples/jsm/libs/stats.module";

////////////////  Global Variables  ////////////////
let fpsControls;
let instructiontext = document.getElementById("instruction-text");
let readpropertiesCounter = 0;
let fpsHelper;
let sidebar;
let tree;
let coordinatesbar;

//Variables for StateDevice
let firstPersonControls = false;
let orbitControls = false;
let modeltree = false;
let properties;
let clipper = false;
let picker = false;
let dimension = false;
let floorplan = false

////////////////  Viewer Setup  ////////////////
const container = document.getElementById("viewer-container");
const viewer = new IfcViewerAPI({ container });
const camera = viewer.context.ifcCamera.activeCamera;
const renderer = viewer.context.renderer;
const scene = viewer.context.scene;
console.log(renderer);
viewer.grid.setGrid();

initilizeApp();

//List of loaded models
const models = [];
const worldOrigin = { x: 0, y: 0, z: 0 };

//loadIfc("./models/01.ifc");
//loadIfc('./models/02.ifc');
//loadIfc('./models/03.ifc');
// loadIfc('./models/04.ifc');
//loadIfc('./models/05.ifc');
// loadIfc('./models/Viaduct_Viaduct_KW04_N.ifc');
//loadIfc('./models/Viaduct_Viaduct_KW04_B.ifc');
loadIfc('./models/Viaduct_Viaduct_KNM19.ifc');

let forward = false;
let backward = false;
let right = false;
let left = false;
let up = false;
let down = false;
let extraSpeed = false;

//OnKeyDown
window.onkeydown = (event) => {
    console.log(event.code);
    if (firstPersonControls) {
        fpsControlHelper(event, true);
    }
    if(clipper){
      clipperHelper(event);
    }   
    if(dimension){
      dimensionHelper(event);
    }
};

window.onkeyup = (event) => {
    console.log(event.code);
    if (firstPersonControls) {
        fpsControlHelper(event, false);
    }   
};

window.ondblclick = (event) => {
  console.log(event);
  if(clipper){   
      createClipperPlane();
  }
  if(dimension){
    createDimension();    
  }
}

window.onmousemove = async () => {
  if(picker){
    await viewer.IFC.selector.prePickIfcItem();
  } 
  if(dimension){
    trackDimensionPreview();
  }
}

////////////////  Functions  ////////////////
////////////////  Dimension Functions  ////////////////
function createDimension(){
  viewer.dimensions.create();
  const i = viewer.dimensions.getDimensionsLines.length;
  const dim = viewer.dimensions.getDimensionsLines[i-1];
  const text = dim.start.distanceTo(dim.end).toFixed(3) + ' m';
  dim.textLabel.element.innerText = text;
}

function trackDimensionPreview(){
  const previewObject = viewer.dimensions.previewObject;
  if(previewObject.visible){ 
    calculateWorldCoordinates(true,previewObject.position);
  }else{
    calculateWorldCoordinates(false,previewObject);
  }
 
  
}

function calculateWorldCoordinates(vis, position){
  const HTMLx = document.getElementById('x')
  const HTMLy = document.getElementById('y')
  const HTMLz = document.getElementById('z')
  if(vis){
    const x = roundTo(worldOrigin.x + position.x,3);
    const y = roundTo(worldOrigin.y + position.z,3);
    const z = roundTo(worldOrigin.z + position.y,3);
    HTMLx.textContent = x;
    HTMLy.textContent = y;
    HTMLz.textContent = z; 
  }
  else{
    HTMLx.textContent = "-";
    HTMLy.textContent = "-";
    HTMLz.textContent = "-";  
  }

}


////////////////  Clipper Functions  ////////////////
function createClipperPlane(){
  viewer.clipper.createPlane(); 
}

////////////////  ApplicationLoop  ////////////////
const appLoop = () => {
    fpsControlsMove();    
    //controls.update();
    // renderer.render(scene, camera);
    // renderer.update();
    requestAnimationFrame(appLoop);
};

appLoop();

function loadingCalculation(event) {
    const loadingText = document.getElementById("loading-text");
    const text = loadingText.children[1];
    const percent = (event.loaded / event.total) * 100;
    let calc = Math.trunc(percent);
    if (calc > 5) {
        calc = calc - 5;
    }
    text.innerText = calc;
}

function propertiesCalculation() {
    readpropertiesCounter++;
    const loadingText = document.getElementById("loading-text");
    const text = loadingText.children[1];
    const string = readpropertiesCounter *10;
    text.innerText = string;
}

function createTreeMenu(ifcProject) {
    const root = document.getElementById("tree-root");
    removeAllChildren(root);
    const ifcProjectNode = createNestedChild(root, ifcProject);
    ifcProject.children.forEach((child) => {
        constructTreeMenuNode(ifcProjectNode, child);
    });
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function nodeToString(node) {
    const foundProperties = properties[node.expressID];	
	//console.log(foundProperties);
    const nodeText = foundProperties.LongName ;
    if (nodeText == null){
        console.log("longname = null");
        //nodeText = foundProperties.ObjectType;
    }
    const text = `${foundProperties.ObjectType} - ${node.expressID}`;
    return text;
}

function constructTreeMenuNode(parent, node) {
    const children = node.children;
    if (children.length === 0) {
        createSimpleChild(parent, node);
        return;
    }
    const nodeElement = createNestedChild(parent, node);
    children.forEach((child) => {
        constructTreeMenuNode(nodeElement, child);
    });
}

function createNestedChild(parent, node) {
    const content = nodeToString(node);
    const root = document.createElement("li");
    createTitle(root, content);
    const childrenContainer = document.createElement("ul");
    childrenContainer.classList.add("nested");
    root.appendChild(childrenContainer);
    parent.appendChild(root);
    return childrenContainer;
}

function createTitle(parent, content) {
    const title = document.createElement("span");
    title.classList.add("caret");
    title.classList.add("tree-list-item");
    title.onclick = () => {
        title.parentElement.querySelector(".nested").classList.toggle("active");
        title.classList.toggle("caret-down");
  };
    title.textContent = content;
    parent.appendChild(title);
}

function createSimpleChild(parent, node) {
    const content = nodeToString(node);
    const childNode = document.createElement("p");
    childNode.textContent = content;
    childNode.classList.add("tree-list-simple");
    parent.appendChild(childNode);

    childNode.onmouseenter = () => {
        viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);     
    };

    childNode.onclick = async () => {
        viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID]);
    };
}

////////////////  Async Functions  ////////////////
async function loadIfc(url) {
    const loadingText = document.getElementById("loading-text");

    // Load the model
    const loadingCaption = document.getElementById("progress-caption");
    loadingCaption.innerText = "Loading IFC";

    const model = await viewer.IFC.loadIfcUrl(url, true, loadingCalculation);
    models.push(model);
    // Add dropped shadow and post-processing efect
    //await viewer.shadowDropper.renderShadow(model.modelID);
    viewer.context.renderer.postProduction.active = true;

    // Serialize properties
    loadingCaption.innerText = "Reading Properties: ";
    const result = await viewer.IFC.properties.serializeAllProperties(model,undefined,propertiesCalculation);
    console.log(result);
    const file = new File(result, 'properties');

    const rawProperties = await fetch(URL.createObjectURL(file));
    properties = await rawProperties.json();

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);    
    console.log(ifcProject);
    createTreeMenu(ifcProject);
    const matrixArr = viewer.IFC.loader.ifcManager.ifcAPI.GetCoordinationMatrix(model.modelID);
    worldOrigin.x = -matrixArr[12];
    worldOrigin.y = matrixArr[14];
    worldOrigin.z = -matrixArr[13];

    await viewer.plans.computeAllPlanViews(model.modelID);
    const lineMaterial = new LineBasicMaterial({ color: 'black' });
    const baseMaterial1 = new MeshBasicMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 1, // positive value pushes polygon further away
      polygonOffsetUnits: 1,
    });   
    await viewer.edges.create('edgeMode',model.modelID,lineMaterial);
    await viewer.edges.create('planview',model.modelID,lineMaterial,baseMaterial1);    
    loadingText.classList.add("hidden");
}

////////////////  Initialize App ////////////////
function initilizeApp() {
  setupfpsControls();
  tree = document.getElementById("ifc-tree-menu");  
  sidebar = document.getElementById("sidebar-content-container");
  coordinatesbar = document.getElementById("coordinates-bar");
  const pickerbutton = document.getElementById("picker-button");
  pickerbutton.onclick = function () {
    pickerToggle();
    pickerbutton.classList.toggle("button-active");
  };
  const modeltreebutton = document.getElementById("model-tree-button");
  modeltreebutton.onclick = function () {
    modelTreeToggle();
    modeltreebutton.classList.toggle("button-active");
  };
  const fpsbutton = document.getElementById("first-person-button");
  fpsbutton.onclick = function () {
    firstPersonToggle();
    fpsbutton.classList.toggle("button-active");
  };
  const clipperbutton = document.getElementById("clipper-button");
  clipperbutton.onclick = function () {
    clipperToggle();
    clipperbutton.classList.toggle("button-active");
  };
  const dimensiobutton = document.getElementById("dimension-button");
  dimensiobutton.onclick = function () {
    dimensionToggle();
    dimensiobutton.classList.toggle("button-active");
  };
  const floorplanbutton = document.getElementById("floorplan-button");
  floorplanbutton.onclick = function (){
    floorplanToggle();
    floorplanbutton.classList.toggle("button-active");
  }
}

////////////////  Camera Controls  ////////////////
function togglefpsControls(active){  
if (active) {
  fpsHelper = document.createElement('a');
  document.body.appendChild(fpsHelper)
  fpsControls = new PointerLockControls(camera, fpsHelper);  
  fpsHelper.addEventListener("click",function () {
    //lock mouse on screen
    fpsControls.lock();
    }, false );
    fpsHelper.click();
    instructiontextSet("Press R to Exit First Person");
} 
else {   
    console.log(fpsControls);
    fpsControls.unlock();
    fpsHelper.remove();    
    instructiontextSet("");
    viewer.context.getCamera().position = camera.position;    
  }
}

function setupfpsControls(active) {
  fpsControls = new PointerLockControls(camera, fpsHelper);  
}

function fpsControlsMove() {
  let speed = 0.25;
  if (extraSpeed) {
    speed = 0.5;
  }
  if (forward) {
    fpsControls.moveForward(speed);
  }
  if (backward) {
    fpsControls.moveForward(-speed);
  }
  if (left) {
    fpsControls.moveRight(-speed);
  }
  if (right) {
    fpsControls.moveRight(speed);
  }
  if (up) {
    camera.position.addScaledVector(new Vector3(0, 1, 0), 0.5 * speed);
  }
  if (down) {
    camera.position.addScaledVector(new Vector3(0, 1, 0), -0.5 * speed);
  }
}

////////////////  User Interaction  ////////////////
//Firstperson controls
function fpsControlHelper(event, bool) {
  if (event.code === "KeyW") {
    forward = bool;
  }
  if (event.code === "KeyS") {
    backward = bool;
  }
  if (event.code === "KeyA") {
    left = bool;
  }
  if (event.code === "KeyD") {
    right = bool;
  }
  if (event.code === "KeyE") {
    up = bool;
  }
  if (event.code === "KeyQ") {
    down = bool;
  }
  if (event.code === "ShiftLeft") {
    extraSpeed = bool;
  }
  if (event.code === "KeyR"){    
    const fpsbutton = document.getElementById("first-person-button");
    fpsbutton.click();
  }
}

function clipperHelper(event) {
  if (event.code === "Delete") {
    viewer.clipper.deleteAllPlanes();
  }  
}

function dimensionHelper(event) {
  if (event.code === "Delete") {
    viewer.dimensions.deleteAll();
  }  
}

function instructiontextSet(text){
  instructiontext.classList.toggle('hidden');
  instructiontext.innerHTML = text;
}

////////////////  ApplicationState Device  ////////////////
function pickerToggle() {
  if(picker){
    viewer.IFC.selector.unPrepickIfcItems();
  }
    picker = !picker;   
}

function modelTreeToggle() {
  console.log("toggleModelTree");
  if (modeltree) {
    tree.classList.add("hidden");
    viewer.IFC.selector.unHighlightIfcItems();
  } else {
    tree.classList.remove("hidden");
  }
  modeltree = !modeltree;
  viewer.IFC.selector.unpickIfcItems();
  viewer.IFC.selector.unPrepickIfcItems();
}

function firstPersonToggle() {
  console.log("toggleFPS");
  firstPersonControls = !firstPersonControls;
  if(firstPersonControls)
  {
    togglefpsControls(true);
    viewer.context.renderer.postProduction.active = false;
    viewer.context.ifcCamera.cameraControls.enabled = false;
  }
  else{
    togglefpsControls(false);
    viewer.context.renderer.postProduction.active = true;
    viewer.context.ifcCamera.cameraControls.enabled = true;   
 } 
}

function clipperToggle(){
  console.log("ToggleClipper")  
  instructiontextSet("Double click surface to add section plane, Press Delete to remove planes");
  viewer.clipper.active = !clipper;
  clipper = !clipper;
}

function floorplanToggle(){
  if(!floorplan){
    const id = models[0].modelID;
    const plans = viewer.plans.getAll(id);
    const plane = viewer.plans.planLists[id][plans[0]].plane;
    // plane.origin = new Vector3(0,0,0);
    // plane.plane.constant = 0;
    // console.log(plane);
    // console.log(worldOrigin);
    viewer.plans.goTo(models[0].modelID,plans[0]);
    viewer.edges.toggle('planview',true);
  }
  else{
    viewer.plans.exitPlanView();
    viewer.edges.toggle('planview',false);
  }
  floorplan = !floorplan;
}

function dimensionToggle(){
  console.log('dimensiontoggle') 
  instructiontextSet("Double click on endpoints to start and finish dimension, Press Delete to remove dimensions"); 
  coordinatesbar.classList.toggle('hidden');
  if(!dimension){
    viewer.dimensions.active = true;
    viewer.dimensions.previewActive = true;   
    viewer.edges.toggle("edgeMode",true); 
    viewer.context.renderer.postProduction.active = false;
  }
  else{
    viewer.dimensions.active = false;
    viewer.dimensions.previewActive = false;    
    viewer.edges.toggle("edgeMode",false); 
    viewer.context.renderer.postProduction.active = true;
  }
  dimension = !dimension;
}



////////////////  Utils  ////////////////
function roundTo(n, digits) {
  var negative = false;
  if (digits === undefined) {
      digits = 0;
  }
  if (n < 0) {
      negative = true;
      n = n * -1;
  }
  var multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  n = (Math.round(n) / multiplicator).toFixed(digits);
  if (negative) {
      n = (n * -1).toFixed(digits);
  }
  return n;
}