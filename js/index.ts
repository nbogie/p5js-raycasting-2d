"use strict";

//p5.disableFriendlyErrors = true;
const isDebugging = false;
let gWalls: Wall[] = [];
let gAgentRays: Ray[] = [];
let gPlayerRays: Ray[] = [];
let gPlayer: Particle = null;
let gNumWalls: number = 20;
let gNumAgents: number = 100;
let gNumPlayerRays: number = 100;
let gNumStructures = 7;
/* ------------------------------------------------------------------
 * SETUP
 */
const gStructures: Structure[] = [];
function setup() {
  createCanvas(windowWidth, windowHeight);

  repeat(gNumStructures, () => {
    const structure = Structure.createRandom();
    gStructures.push(structure);
    gWalls = gWalls.concat(structure.walls);
  });

  repeat(gNumWalls, () => {
    gWalls.push(Wall.createRandom());
  });
  repeat(gNumAgents, () => {
    gAgentRays.push(Ray.createRandom());
  });

  repeat(gNumPlayerRays, ix => {
    const angle = (ix * TWO_PI) / gNumPlayerRays;
    gPlayerRays.push(new Ray(mousePosAsVector(), angle));
  });

  gPlayer = Particle.createRandom();
}

function testCase() {
  const ray: Ray = new Ray(
    createVector(115, 870),
    createVector(-0.98, 0.18).heading()
  );
  const wall = new Wall(createVector(37, 520), createVector(350, 440));
  ray.intersectionWithWall(wall);
}

function mousePosAsVector() {
  return createVector(mouseX, mouseY);
}
function update() {
  gPlayer.setPosition(mousePosAsVector());
  gPlayer.update();

  for (let ray of gAgentRays) {
    ray.updateWithRoaming(gWalls, mousePosAsVector());
  }

  for (let ray of gPlayerRays) {
    ray.setPosition(mousePosAsVector());
    ray.updateIntersections(gWalls);
  }
}
/*
 * DRAW
 */
function draw() {
  update();
  background(0);
  fill("black");
  noStroke();

  for (let wall of gWalls) {
    wall.draw();
  }
  for (let ray of gAgentRays) {
    ray.drawAgentCanSeePlayer();
  }
  for (let ray of gPlayerRays) {
    ray.drawRayUntilFirstIntersection();
  }
  gPlayer.draw();
}
