class Wall {
  a: p5.Vector;
  b: p5.Vector;

  myColor: p5.Color;

  constructor(a: p5.Vector, b: p5.Vector) {
    this.a = a.copy();
    this.b = b.copy();
    this.myColor = color(243, 134, 48);
  }
  draw() {
    stroke(this.myColor);
    strokeWeight(4);
    line(this.a.x, this.a.y, this.b.x, this.b.y);

    noStroke();
    fill(this.myColor);
    [this.a, this.b].forEach(pt => {
      //circle(pt.x, pt.y, 5);
    });
  }
  midPoint(): p5.Vector {
    return this.a.copy().lerp(this.b, 0.5);
  }

  length(): number {
    return dist(this.a.x, this.a.y, this.b.x, this.b.y);
  }

  static createRandom() {
    const p1 = randomScreenPosition();
    const p2 = p1.copy().add(p5.Vector.random2D().mult(random(40, 400)));
    return new Wall(p1, p2);
  }
}
