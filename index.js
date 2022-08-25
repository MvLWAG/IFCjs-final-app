////////////////  Imports  ////////////////
import { Color, Vector3 } from "three";
import { IfcViewerAPI, NavigationModes } from "web-ifc-viewer";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import Stats from "three/examples/jsm/libs/stats.module";

////////////////  Global Variables  ////////////////
let fpsControls;

//Variables for StateDevice
let firstPersonControls = false;
let orbitControls = false;
let modeltree = false;
let readpropertiesCounter = 0;
let properties;

////////////////  Viewer Setup  ////////////////
const container = document.getElementById("viewer-container");
const viewer = new IfcViewerAPI({ container });
const camera = viewer.context.ifcCamera.activeCamera;
const renderer = viewer.context.renderer;
const scene = viewer.context.scene;
console.log(renderer);
viewer.grid.setGrid();

initilizeApp();

// const stats = new Stats();
// stats.showPanel( 2 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );

//viewer.context.ifcCamera.cameraControls.enabled = false;

//List of loaded models
const models = [];
const worldOrigin = { x: 0, y: 0, z: 0 };

loadIfc("./models/01.ifc");
// loadIfc('./models/02.ifc');
//loadIfc('./models/03.ifc');
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
  if (firstPersonControls) {
    fpsControlHelper(event, true);
  }
};

window.onkeyup = (event) => {
  console.log(event.code);
  if (firstPersonControls) {
    fpsControlHelper(event, false);
  }
};

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
    console.log(string);
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
  await viewer.shadowDropper.renderShadow(model.modelID);
  viewer.context.renderer.postProduction.active = true;

  // Serialize properties
  loadingCaption.innerText = "Reading Properties: ";
  const result = await viewer.IFC.properties.serializeAllProperties(model,undefined,propertiesCalculation);
  console.log(result);
  const file = new File(result, 'properties');

  const rawProperties = await fetch(URL.createObjectURL(file));
  properties = await rawProperties.json();

//   const ifcProject = await viewer.IFC.getSpatialStructure(model.modelID);
//   console.log(ifcProject);
//   createTreeMenu(ifcProject);

    // Get spatial tree
    const tree2 = await constructSpatialTree();
    console.log(tree2);

  const tree = document.getElementById("ifc-tree-menu");
  const matrixArr = viewer.IFC.loader.ifcManager.ifcAPI.GetCoordinationMatrix(
    model.modelID
  );
  worldOrigin.x = -matrixArr[12];
  worldOrigin.y = matrixArr[14];
  worldOrigin.z = -matrixArr[13];
  
  loadingText.classList.add("hidden");
}

function getFirstItemOfType(type) {
	return Object.values(properties).find(item => item.type === type);
}

function getAllItemsOfType(type) {
	return Object.values(properties).filter(item => item.type === type);
}


async function constructSpatialTree() {
	const ifcProject = getFirstItemOfType('IFCPROJECT');

	const ifcProjectNode = {
		expressID: ifcProject.expressID,
		type: 'IFCPROJECT',
		children: [],
	};

	const relContained = getAllItemsOfType('IFCRELAGGREGATES');
	const relSpatial = getAllItemsOfType('IFCRELCONTAINEDINSPATIALSTRUCTURE');

	await constructSpatialTreeNode(
		ifcProjectNode,
		relContained,
		relSpatial,
	);

	return ifcProjectNode;

}

// Recursively constructs the spatial tree
async function constructSpatialTreeNode(item,contains,spatials,) {
	const spatialRels = spatials.filter(
		rel => rel.RelatingStructure === item.expressID,
	);
	const containsRels = contains.filter(
		rel => rel.RelatingObject === item.expressID,
	);

	const spatialRelsIDs = [];
	spatialRels.forEach(rel => spatialRelsIDs.push(...rel.RelatedElements));

	const containsRelsIDs = [];
	containsRels.forEach(rel => containsRelsIDs.push(...rel.RelatedObjects));

	const childrenIDs = [...spatialRelsIDs, ...containsRelsIDs];

	const children = [];
	for (let i = 0; i < childrenIDs.length; i++) {
		const childID = childrenIDs[i];
		const props = properties[childID];
		const child = {
			expressID: props.expressID,
			type: props.type,
			children: [],
		};

		await constructSpatialTreeNode(child, contains, spatials);
		children.push(child);
	}

	item.children = children;
}




////////////////  Initialize App ////////////////
function initilizeApp() {
  setupfpsControls(false);
  const tree = document.getElementById("ifc-tree-menu");
  const button = document.getElementById("model-tree-button");
  button.onclick = function () {
    modelTreeToggle();
    button.classList.toggle("button-active");
  };
}

////////////////  Camera Controls  ////////////////
function setupfpsControls(active) {
  fpsControls = new PointerLockControls(camera, document.body);
  //add event listener to your document.body
  if (active) {
    document.body.addEventListener(
      "click",
      function () {
        //lock mouse on screen
        fpsControls.lock();
      },
      false
    );
  } else {
    document.body.removeEventListener("click", this);
  }
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
}

////////////////  ApplicationState Device  ////////////////

function modelTreeToggle() {
  console.log("toggle");
  const tree = document.getElementById("ifc-tree-menu");
  if (modeltree) {
    tree.classList.add("hidden");
  } else {
    tree.classList.remove("hidden");
  }
  modeltree = !modeltree;
}
