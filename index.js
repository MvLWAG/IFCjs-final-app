////////////////  Imports  ////////////////
import { Color, Vector3} from 'three';
import { IfcViewerAPI, NavigationModes } from 'web-ifc-viewer';
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

////////////////  Global Variables  ////////////////
let fpsControls;

//Variables for StateDevice
let firstPersonControls = false;
let orbitControls = false;
let modeltree = false;


////////////////  Viewer Setup  ////////////////
const container = document.getElementById('viewer-container');
const viewer = new IfcViewerAPI({ container });
const camera = viewer.context.ifcCamera.activeCamera;
const renderer = viewer.context.renderer;
const scene = viewer.context.scene;
console.log(renderer);
viewer.grid.setGrid();

initilizeApp();

//viewer.context.ifcCamera.cameraControls.enabled = false;

 
//List of loaded models
const models = [];
const worldOrigin = {x: 0, y: 0,z:0 };

//loadIfc('./models/01.ifc');
// loadIfc('./models/02.ifc');
loadIfc('./models/03.ifc');
// loadIfc('./models/04.ifc');
//loadIfc('./models/05.ifc');

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
    if(firstPersonControls)
    {
        fpsControlHelper(event,true);
    }
    
}

window.onkeyup = (event) => {
    console.log(event.code);    
    if(firstPersonControls)
    {
        fpsControlHelper(event,false);
    }      
}

////////////////  Functions  ////////////////
//Applcation loop
const appLoop = () => {    
    fpsControlsMove();
    //controls.update();
    // renderer.render(scene, camera);
    // renderer.update();    
    requestAnimationFrame(appLoop);
};

appLoop();

function loadingCalculation(event) {   
    const loadingText = document.getElementById('loading-text');
    const text = loadingText.children[1];
    const percent = event.loaded / event.total * 100;
    let calc = Math.trunc(percent);    
    if(calc > 5)
    {
        calc = calc - 5;
    }
    text.innerText = calc;   
}

function createTreeMenu(ifcProject){
    const root = document.getElementById('tree-root');
    removeAllChildren(root);
    const ifcProjectNode = createNestedChild(root, ifcProject);
    ifcProject.children.forEach(child => {
        constructTreeMenuNode(ifcProjectNode, child);
    })
}

function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function nodeToString(node) { 
    const text = `${node.type} - ${node.expressID}`;   
    //console.log(text);
    return text;
}

function constructTreeMenuNode(parent, node) {
    const children = node.children;
    if (children.length === 0) {
        createSimpleChild(parent, node);
        return;
    }
    const nodeElement = createNestedChild(parent, node);
    children.forEach(child => {
        constructTreeMenuNode(nodeElement, child);
    })
}

function createNestedChild(parent, node) {
    const content = nodeToString(node);
    const root = document.createElement('li');
    createTitle(root, content);
    const childrenContainer = document.createElement('ul');
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
    }
    title.textContent = content;
    parent.appendChild(title);
}

function createSimpleChild(parent, node) {
    const content = nodeToString(node);
    const childNode = document.createElement('p');
    childNode.textContent = content;
    childNode.classList.add('tree-list-simple');
    parent.appendChild(childNode);

    childNode.onmouseenter = () => {
        viewer.IFC.selector.prepickIfcItemsByID(0, [node.expressID]);
    }

    childNode.onclick = async () => {
        viewer.IFC.selector.pickIfcItemsByID(0, [node.expressID]);
    }
}

////////////////  Async Functions  ////////////////
async function loadIfc(url) {
	const loadingText = document.getElementById('loading-text');
     
    // Load the model
    const model = await viewer.IFC.loadIfcUrl(url,true,loadingCalculation);
    models.push(model);
	// Add dropped shadow and post-processing efect
    await viewer.shadowDropper.renderShadow(model.modelID);
    viewer.context.renderer.postProduction.active = true;

    const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);   
    console.log(ifcProject);
    createTreeMenu(ifcProject);

    loadingText.classList.add('hidden');

    const tree = document.getElementById('ifc-tree-menu'); 
    const matrixArr = viewer.IFC.loader.ifcManager.ifcAPI.GetCoordinationMatrix(model.modelID);     
    worldOrigin.x = -matrixArr[12];
    worldOrigin.y = matrixArr[14];
    worldOrigin.z = -matrixArr[13];

    console.log(worldOrigin);
    const props = await viewer.IFC.getProperties(model.modelID, ifcProject.expressID, true, true);
    console.log(props);

}

////////////////  Initialize App ////////////////
function initilizeApp(){
    setupfpsControls(false);
    const tree = document.getElementById('ifc-tree-menu')
    const button = document.getElementById('model-tree-button');
    button.onclick = function() {
        modelTreeToggle()
        button.classList.toggle('button-active')
    }
}

////////////////  Camera Controls  ////////////////
function setupfpsControls(active){ 
    fpsControls = new PointerLockControls(camera,document.body);    
    //add event listener to your document.body
    if(active){
        document.body.addEventListener( 'click', function () {
            //lock mouse on screen
            fpsControls.lock();
        }, false );    
    }
    else{
        document.body.removeEventListener('click',this);
    }    
}

function fpsControlsMove(){
    let speed = 0.25;
    if(extraSpeed) { speed = 0.5};
    if(forward){fpsControls.moveForward(speed);}
    if(backward){fpsControls.moveForward(-speed);}
    if(left){fpsControls.moveRight(-speed);}
    if(right){fpsControls.moveRight(speed);}      
    if(up){camera.position.addScaledVector(new Vector3(0,1,0),0.5*speed);}    
    if(down){ camera.position.addScaledVector(new Vector3(0,1,0),-0.5*speed);}  
}


////////////////  User Interaction  ////////////////
function fpsControlHelper (event,bool){
    if(event.code === "KeyW"){forward = bool;}
    if(event.code === "KeyS"){backward = bool;}
    if(event.code === "KeyA"){left = bool;}
    if(event.code === "KeyD"){right = bool;}
    if(event.code === "KeyE"){up = bool;}
    if(event.code === "KeyQ"){down = bool;}
    if(event.code === "ShiftLeft"){extraSpeed = bool;}
}

var sidebarresize = document.getElementById("sidebar-resize");
var sidebarleft = document.getElementById("sidebar-left");
var sidebarcontainer = document.getElementById("sidebar-container");
var moveX =  sidebarleft.getBoundingClientRect().width + sidebarresize.getBoundingClientRect().width / 2;
var drag = false;

sidebarresize.addEventListener("mousedown", function (e) {
   drag = true;
   moveX = e.x;
   sidebarleft.classList.remove("pointer-none");
   sidebarleft.classList.add("pointer-auto");
});

sidebarcontainer.addEventListener("mousemove", function (e) {
   moveX = e.x;
   if (drag)
        sidebarleft.style.width =
        moveX + sidebarresize.getBoundingClientRect().width / 2 + "px";
});

sidebarcontainer.addEventListener("mouseup", function (e) {
   drag = false;
   sidebarleft.classList.remove("pointer-auto");
   sidebarleft.classList.add("pointer-none");
});

////////////////  ApplicationState Device  ////////////////

function modelTreeToggle(){
    console.log("toggle");    
    const tree = document.getElementById('ifc-tree-menu');
    if(modeltree)
    {
        tree.classList.add('hidden');   
    }
    else{
        tree.classList.remove('hidden');    
    }
    modeltree = !modeltree;
}

