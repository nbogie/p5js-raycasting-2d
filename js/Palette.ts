class Palette {
  static getColors() {
    return [
      color(250, 105, 0),
      color(105, 210, 231),
      color(167, 219, 216),
      color(243, 134, 48)
    ];
  }
  static randomColor(): p5.Color {
    return random(Palette.getColors());
  }
}
