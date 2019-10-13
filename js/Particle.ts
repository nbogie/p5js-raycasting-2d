class Particle {
  pos: p5.Vector;
  heading: number;

  constructor(pos: p5.Vector) {
    this.pos = pos.copy();
    this.heading = 0;
  }
  draw() {
    noStroke();
    fill("black");
    rectMode(CENTER);
    square(this.pos.x, this.pos.y, 3);
    fill(0, 20);
  }
  update() {
    const mouseMovementAngle = angleOfLastMouseMovement();
    if (mouseMovementAngle !== undefined) {
      this.heading = mouseMovementAngle;
    }
  }

  setPosition(pos: p5.Vector) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
  }

  static createRandom() {
    return new Particle(randomScreenPosition());
  }
}
