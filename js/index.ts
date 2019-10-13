"use strict";

p5.disableFriendlyErrors = true;
const isDebugging = false;
let gAgents: Agent[] = [];
let gPlayerRays: Ray[] = [];
let gPlayer: Particle = null;
let gNumWalls: number = 20;
let gNumAgents: number = 100;
let gNumPlayerRays: number = 100;
let gNumStructures = 30;
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

  gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector());

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
  return [[tl, tr], [tr, br], [bl, br], [tl, bl]].map(
    ([pt1, pt2]) => new Wall(pt1, pt2)
  );
}
function getAllWalls(): Wall[] {
  const wallsFromStructures = gStructures.flatMap(
    (structure: Structure) => structure.walls
  );
  const screenWalls = makeScreenWalls();
  return screenWalls.concat(wallsFromStructures);
}

function createRaysAtPosition(numRays: number, pos: p5.Vector) {
  const rays: Ray[] = [];
  distributeUpTo(numRays, TWO_PI, val =>
    rays.push(new Ray(pos, { angleRads: val, walls: getAllWalls() }))
  );
  return rays;
}

function mousePosAsVector() {
  return createVector(mouseX, mouseY);
}
function update() {
  gPlayer.setPosition(mousePosAsVector());
  gPlayer.update();

  for (let s of gStructures) {
    if (isMovingStructures) {
      s.update();
    }
  }
  for (let agent of gAgents) {
    agent.update(getAllWalls(), mousePosAsVector());
  }

  gPlayerRays = createRaysAtPosition(gNumPlayerRays, mousePosAsVector());
}
/*
 * DRAW
 */
function draw() {
  update();
  background(0);
  fill("black");
  noStroke();

  for (let s of gStructures) {
    s.draw();
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
let isMovingStructures = true;
function toggleMovingStructures() {
  isMovingStructures = !isMovingStructures;
}
function mousePressed() {
  toggleMovingStructures();
}
