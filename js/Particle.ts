class Particle {
  pos: p5.Vector;

  constructor(pos: p5.Vector) {
    this.pos = pos.copy();
  }
  draw() {
    noStroke();
    fill("black");
    rectMode(CENTER);
    square(this.pos.x, this.pos.y, 3);
    fill(0, 20);
  }
  update() {}

  setPosition(pos: p5.Vector) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
  }

  static createRandom() {
    return new Particle(randomScreenPosition());
  }
}
