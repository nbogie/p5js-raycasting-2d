class Structure {
  randomColor(): p5.Color {
    return random([
      color(250, 105, 0),
      color(105, 210, 231),
      color(167, 219, 216),
      color(243, 134, 48)
    ]);
  }
  isFilledShape = false;
  center: p5.Vector;
  walls: Wall[];
  movementSpeed: number;
  constructor(center: p5.Vector, radius: number, numSides: number) {
    const myColor = this.randomColor();
    this.movementSpeed = -random(1, 5);
    if (numSides === 2) {
      const singleWall = Wall.createRandom();
      singleWall.myColor = myColor;
      this.walls = [singleWall];
      this.center = singleWall.midPoint();
    } else {
      this.center = center.copy();

      const vertices = [];
      for (let i = 0; i < numSides; i++) {
        const angle = (i * TWO_PI) / numSides;
        vertices.push(
          p5.Vector.fromAngle(angle)
            .mult(radius)
            .add(this.center)
        );
      }
      const walls: Wall[] = [];
      for (let i = 0; i < numSides; i++) {
        const v1 = vertices[i];
        const v2 = i === numSides - 1 ? vertices[0] : vertices[i + 1];
        const wall = new Wall(v1, v2);
        wall.myColor = myColor;
        walls.push(wall);
      }

      this.walls = walls;
    }
  }
  update() {
    let move: number = this.movementSpeed;
    if (this.center.x + move < 0) {
      move += width;
    }

    this.center.x += move;
    for (let wall of this.walls) {
      wall.translate(createVector(move, 0));
    }
  }
  draw() {
    for (let wall of this.walls) {
      wall.draw();
    }
    if (this.isFilledShape) {
      beginShape();
      for (let wall of this.walls) {
        for (let pt of [wall.a, wall.b]) {
          vertex(pt.x, pt.y);
        }
      }
      endShape(CLOSE);
    }
  }

  static createRandom() {
    const center = randomScreenPosition();
    const numSides = random([2, 2, 2, 3, 4, 5, 8]);
    return new Structure(center, random(20, random(100, 200)), numSides);
  }
}
