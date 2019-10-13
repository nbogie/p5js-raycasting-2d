"use strict";
p5.disableFriendlyErrors = true;

let gAgents: Agent[] = [];
let gPlayerRays: Ray[] = [];
let gPlayer: Particle = null;
let gNumAgents: number = 100;
let gNumPlayerRays: number = 200;
let gNumStructures = 10;
let appOptions: AppOptions = randomAppOptions();

interface AppOptions {
  isMovingStructures: boolean;
  isRotatingStructures: boolean;
  isDrawingIn3D: boolean;
  isDrawStructures: boolean;
}
let defaultAppOptions: AppOptions = {
  isMovingStructures: true,
  isRotatingStructures: true,
  isDrawingIn3D: false,
  isDrawStructures: true
};

function randomAppOptions(): AppOptions {
  return {
    isMovingStructures: randomBoolean(),
    isRotatingStructures: randomBoolean(),
    isDrawStructures: randomBoolean(),
    isDrawingIn3D: randomBoolean()
  };
}

/* ------------------------------------------------------------------
 * SETUP
 */
const gStructures: Structure[] = [];
function setup() {
  createCanvas(windowWidth, windowHeight);

  repeat(gNumStructures, () => {
    const structure = Structure.createRandom();
    gStructures.push(structure);
  });

  repeat(gNumAgents, () => {
    gAgents.push(Agent.createRandom());
  });

  gPlayerRays = createRaysAtPosition(
    gNumPlayerRays,
    mousePosAsVector(),
    0,
    gNumPlayerRays
  );
  gPlayer = Particle.createRandom();
  mouseX = centerScreenPos().x;
  mouseY = centerScreenPos().y;
}

function makeScreenWalls(): Wall[] {
  const [tl, tr, br, bl] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height]
  ].map(([x, y]) => createVector(x, y));
  return [[tl, tr], [tr, br], [bl, br], [tl, bl]].map(([pt1, pt2]) => {
    const w = new Wall(pt1, pt2);
    w.myColor = color("darkgray");
    return w;
  });
}
function getAllWalls(): Wall[] {
  const wallsFromStructures = gStructures.flatMap(
    (structure: Structure) => structure.walls
  );
  const screenWalls = makeScreenWalls();
  return screenWalls.concat(wallsFromStructures);
}

function createRaysAtPosition(
  numRays: number,
  pos: p5.Vector,
  heading: number,
  fovRadians: number
) {
  const halfFOV = fovRadians / 2;
  return collectDistributedBetween(
    numRays,
    heading - halfFOV,
    heading + halfFOV,
    val => new Ray(pos, { angleRads: val, walls: getAllWalls() })
  );
}

function update() {
  gPlayer.setPosition(mousePosAsVector());
  gPlayer.update();

  for (let s of gStructures) {
    if (appOptions.isMovingStructures) {
      s.shouldRotate = true;
      s.update();
    }
  }
  for (let agent of gAgents) {
    agent.update(getAllWalls(), mousePosAsVector());
  }

  gPlayerRays = createRaysAtPosition(
    gNumPlayerRays,
    mousePosAsVector(),
    gPlayer.heading,
    radians(60)
  );
}

/* ---------------------------------------------------------------------------
 * DRAW
 */
function draw() {
  update();
  background(0);
  appOptions.isDrawingIn3D ? drawFake3D() : drawTopDown();
  drawPlayerDebugInfo();
}

function drawPlayerDebugInfo() {
  push();
  translate(gPlayer.pos.x, gPlayer.pos.y);
  noFill();
  stroke("purple");
  const vec = p5.Vector.fromAngle(gPlayer.heading).mult(50);
  line(0, 0, vec.x, vec.y);
  circle(0, 0, 10);
  pop();
}

function drawFake3D() {
  background("gray");
  const buff = makeDistancesBuffer(gPlayerRays);
  drawDistancesBuffer(buff);
}

function drawTopDown() {
  fill("black");
  noStroke();
  if (appOptions.isDrawStructures) {
    for (let s of gStructures) {
      s.draw();
    }
  }
  for (let wall of getAllWalls()) {
    wall.draw();
  }

  for (let agent of gAgents) {
    agent.draw();
  }
  for (let ray of gPlayerRays) {
    ray.drawRayUntilFirstIntersection();
  }
  gPlayer.draw();
}
function toggle2D3D() {
  appOptions.isDrawingIn3D = !appOptions.isDrawingIn3D;
}
function toggleMovingStructures() {
  appOptions.isMovingStructures = !appOptions.isMovingStructures;
}
function toggleRotatingStructures() {
  appOptions.isRotatingStructures = !appOptions.isRotatingStructures;
}
function mousePressed() {
  toggleMovingStructures();
}
function keyPressed() {
  if (key == "3") {
    toggle2D3D();
  }
  if (key == "r") {
    toggleRotatingStructures();
  }
  if (key == "o") {
    randomiseRenderingOptions();
  }
}
