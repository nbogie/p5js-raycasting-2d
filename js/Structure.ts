class Structure {
  center: p5.Vector;
  walls: Wall[];

  constructor(center: p5.Vector, radius: number, numSides: number) {
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
      walls.push(new Wall(v1, v2));
    }

    this.walls = walls;
  }

  draw() {
    for (let wall of this.walls) {
      wall.draw();
    }
  }

  static createRandom() {
    const center = randomScreenPosition();
    return new Structure(center, random(20, 200), random([3, 4, 5, 8]));
  }
}
