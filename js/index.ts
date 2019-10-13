"use strict";
p5.disableFriendlyErrors = true;
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
let appOptions: AppOptions = randomAppOptions();

function randomAppOptions(): AppOptions {
  return {
    isMovingStructures: randomBoolean(),
    isRotatingStructures: randomBoolean(),
    isDrawStructures: randomBoolean(),
    isDrawingIn3D: randomBoolean()
  };
}

let gAgents: Agent[] = [];
let gPlayerRays: Ray[] = [];
let gPlayer: Particle = null;
let gNumWalls: number = 20;
let gNumAgents: number = 100;
let gNumPlayerRays: number = 100;
let gNumStructures = 10;
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

  gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector(), 0);
  gPlayer = Particle.createRandom();
  mouseX = centerPos().x;
  mouseY = centerPos().y;
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
  heading: number
) {
  const rays: Ray[] = [];
  const halfFOV = radians(30);
  distributeBetween(numRays, heading - halfFOV, heading + halfFOV, val =>
    rays.push(new Ray(pos, { angleRads: val, walls: getAllWalls() }))
  );

  // distributeUpTo(numRays, TWO_PI / 8, val =>
  //   rays.push(new Ray(pos, { angleRads: val, walls: getAllWalls() }))
  // );
  return rays;
}

function mousePosAsVector() {
  return createVector(mouseX, mouseY);
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
    gPlayer.heading
  );
}

/*
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
