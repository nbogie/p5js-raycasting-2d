"use strict";

//p5.disableFriendlyErrors = true;
const isDebugging = false;
let gWalls: Wall[] = [];
let gRays: Ray[] = [];
let gPlayer: Particle = null;
let gNumWalls: number = 20;
let gNumRays: number = 100;
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
  console.log(gWalls);

  repeat(gNumWalls, () => {
    gWalls.push(Wall.createRandom());
  });
  repeat(gNumRays, () => {
    gRays.push(Ray.createRandom());
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

  for (let ray of gRays) {
    ray.updateWithRoaming(gWalls, mousePosAsVector();
    //ray.setPosition(mousePosAsVector());
    //ray.updateIntersections(gWalls);
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
  stroke("cadetblue");
  textSize(20);
  text("hello", width / 2, height / 2);

  for (let wall of gWalls) {
    wall.draw();
  }
  for (let ray of gRays) {
    ray.draw();
  }
  gPlayer.draw();
}
