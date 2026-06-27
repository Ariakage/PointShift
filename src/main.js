import Phaser from 'phaser';
import './styles.css';

export const UNIT = 25;

const PLAYER_NICKNAME = 'Dot';
const PLAYER_SPEED = 48 * UNIT;
const NICKNAME_GAP = 4;
const GRAVITY = 38 * UNIT;
const JUMP_HEIGHT = UNIT;
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
const START_HEIGHT_UNITS = 3;
const HORIZON_THICKNESS = Math.max(1, Math.round(UNIT / 10));
const TRAIL_LIFETIME_MS = 520;
const MAX_TRAIL_SAMPLES = 48;
const TRAIL_STYLE = {
  mode: 'pixel-fade',
  maxAlpha: 0.38,
  minAlpha: 0.05,
  maxScale: 0.82,
  minScale: 0.32
};
const PLAYER_COLOR = 0xffffff;
const TEXT_COLOR = '#ffffff';
const DISABLED_DOOR_COLOR = 0x777777;
const PIXEL_FONT = '"Courier New", monospace';
const REMARK_TEXT =
  'Due to certain factors, this game is very simple and suggested. Please note that this is not your fault, nor is it our fault. But some things still require some time.';
const INTRO_FADE_DURATION_MS = 1500;
const MAX_REMARK_WRAP_WIDTH = 640;
const DOOR_WIDTH = UNIT;
const DOOR_HEIGHT = 2 * UNIT;
const DOOR_STYLE = 'black-white-pixel-outline';
const LEVEL_TRANSITION_DURATION_MS = 900;
const PARKOUR_WALL_HEIGHT_UNITS = 3;
const PARKOUR_WALL_WIDTH = 2 * UNIT;
const PARKOUR_DOOR_GAP = UNIT;
const WEIGHT_BLOCK_SIZE = 2 * UNIT;
const WEIGHT_BLOCK_DIGITS = '100';
const WEIGHT_BLOCK_INITIAL_DECIMAL_INDEX = 2;
const PLAYER_PUSH_WEIGHT_KG = 1;
const LEVEL3_BLOCK_SIZE = 3 * UNIT;
const JUMP_HEIGHT_DIGITS = '10';
const JUMP_HEIGHT_INITIAL_DECIMAL_INDEX = 1;
const LEVEL4_MOVING_BLOCK_WIDTH = 3 * UNIT;
const LEVEL4_MOVING_BLOCK_HEIGHT = UNIT;
const LEVEL4_MOVING_BLOCK_RANGE = 7 * UNIT;
const LEVEL4_MOVE_SPEED_DIGITS = '60';
const LEVEL4_MOVE_SPEED_INITIAL_DECIMAL_INDEX = 1;
const END_ANIMATION_DURATION_MS = 900;
const BUTTON_WIDTH = 2 * UNIT;
const BUTTON_HEIGHT = Math.max(1, Math.round(UNIT / 2));
const BUTTON_PRESS_DURATION_MS = 420;
const BLOCK_LIFT_DURATION_MS = 720;
const LOCK_WHITE_DURATION_MS = 360;
const LOCK_SHATTER_DURATION_MS = 560;

class BlackScene extends Phaser.Scene {
  constructor() {
    super('BlackScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.physics.world.gravity.y = GRAVITY;

    this.gameState = 'level1';
    this.sceneEmpty = false;
    this.transition = {
      active: false,
      direction: 'right-to-left',
      elapsed: 0,
      duration: LEVEL_TRANSITION_DURATION_MS,
      offsetX: 0,
      startScrollX: 0,
      targetState: 'level2'
    };
    this.trailSamples = [];
    this.introTextAlpha = 1;
    this.introFadeActive = false;
    this.velocity = { y: 0 };
    this.grounded = false;
    this.staticPhysicsObjects = [];
    this.staticColliders = [];
    this.weightDecimalIndex = WEIGHT_BLOCK_INITIAL_DECIMAL_INDEX;
    this.jumpHeightDecimalIndex = JUMP_HEIGHT_INITIAL_DECIMAL_INDEX;
    this.level4MoveSpeedDecimalIndex = LEVEL4_MOVE_SPEED_INITIAL_DECIMAL_INDEX;
    this.level4MovingBlockOffset = 0;
    this.level4MovingBlockDirection = 1;
    this.level4EndActive = false;
    this.level4EndElapsed = 0;
    this.weightBlockObject = null;
    this.buttonPressing = false;
    this.buttonPressed = false;
    this.buttonPressProgress = 0;
    this.blockLifting = false;
    this.blockLiftProgress = 0;
    this.blockLiftStartY = 0;
    this.blockLiftTargetY = 0;
    this.level2LockSequenceActive = false;
    this.level2LockElapsed = 0;
    this.level2LockBroken = false;
    this.level2DoorUnlocked = false;

    this.blackFill = this.add.graphics();
    this.trailGraphics = this.add.graphics().setDepth(1);
    this.horizonGraphics = this.add.graphics().setDepth(2);
    this.platformGraphics = this.add.graphics().setDepth(2);
    this.doorGraphics = this.add.graphics().setDepth(3);
    this.levelObjectGraphics = this.add.graphics().setDepth(3);
    this.controlsGuideGraphics = this.add.graphics().setDepth(5).setScrollFactor(0);
    this.controlsGuideTexts = [];
    this.uiTexts = this.createUiTexts();
    this.weightBlockText = this.add
      .text(0, 0, this.getWeightBlockLabel(), {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: '10px',
        fontStyle: '700'
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setResolution(1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.weightBlockText.on('pointerdown', this.handleWeightTextPointerDown, this);
    this.level2GuideText = this.add
      .text(0, 0, '', {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: '12px',
        fontStyle: '700',
        lineSpacing: 4
      })
      .setScrollFactor(0)
      .setDepth(5)
      .setResolution(1)
      .setVisible(false);
    this.level3GuideText = this.add
      .text(0, 0, '', {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: '12px',
        fontStyle: '700',
        lineSpacing: 4
      })
      .setScrollFactor(0)
      .setDepth(5)
      .setResolution(1)
      .setVisible(false);
    this.jumpHeightText = this.add
      .text(0, 0, this.getJumpHeightLabel(), {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: '14px',
        fontStyle: '700',
        lineSpacing: 4,
        align: 'right'
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(5)
      .setResolution(1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.jumpHeightText.on('pointerdown', this.handleRightSideNumberPointerDown, this);
    this.endText = this.createPixelText('End', 46)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.2)
      .setDepth(8)
      .setVisible(false);

    this.playerPosition = this.getInitialPlayerPosition();
    this.precisePlayerX = this.playerPosition.x;
    this.precisePlayerY = this.playerPosition.y;
    this.createPlayer();

    this.nicknameText = this.add
      .text(0, 0, PLAYER_NICKNAME, {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: '12px',
        fontStyle: '700'
      })
      .setOrigin(0.5, 1)
      .setDepth(5)
      .setResolution(1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      jumpW: Phaser.Input.Keyboard.KeyCodes.W
    });
    this.input.keyboard.on('keydown-SPACE', this.jump, this);
    this.input.keyboard.on('keydown-W', this.jump, this);
    this.input.keyboard.on('keydown-UP', this.jump, this);
    this.input.mouse?.disableContextMenu();

    this.paintBlack();
    this.drawHorizon();
    this.drawPlatforms();
    this.drawDoor();
    this.drawLevelObjects();
    this.rebuildPhysicsSolids();
    this.positionUiTexts();
    this.drawControlsGuide();
    this.positionNickname();
    this.attachDebugState();

    this.scale.on('resize', this.handleResize, this);
  }

  update(_time, delta) {
    const clampedDelta = Math.min(delta, 50);

    if (this.transition.active) {
      this.updateLevelTransition(clampedDelta);
      return;
    }

    const previousX = this.playerPosition.x;
    const previousY = this.playerPosition.y;
    const direction = this.getMovementDirection();

    if (direction !== 0) {
      this.startIntroFade();
    }

    if (this.player.body.enable) {
      this.player.body.setVelocityX(direction * PLAYER_SPEED);
      this.applyPlayerBounds();
    }

    this.syncPlayerState();
    this.updateIntroFade(clampedDelta);
    this.settleWeightBlockMotion();
    this.updateLevel2Mechanism(clampedDelta);
    this.updateLevel4MovingBlock(clampedDelta);
    this.updateLevel4End(clampedDelta);

    if (this.gameState === 'level2') {
      this.drawDoor();
    }

    if (this.playerPosition.x !== previousX || this.playerPosition.y !== previousY) {
      this.addTrailSample(previousX, previousY);
    }

    this.updateTrail(clampedDelta);
    this.drawLevelObjects();
    this.positionUiTexts();
    this.positionNickname();
  }

  updateLevel2Mechanism(delta) {
    if (this.gameState !== 'level2') {
      return;
    }

    if (this.buttonPressing) {
      this.buttonPressProgress = Phaser.Math.Clamp(
        this.buttonPressProgress + delta / BUTTON_PRESS_DURATION_MS,
        0,
        1
      );

      if (this.buttonPressProgress >= 1) {
        this.buttonPressing = false;
        this.buttonPressed = true;
        this.startBlockLift();
      }
    }

    if (this.blockLifting && this.weightBlockObject?.body) {
      this.blockLiftProgress = Phaser.Math.Clamp(
        this.blockLiftProgress + delta / BLOCK_LIFT_DURATION_MS,
        0,
        1
      );
      const easedProgress = 1 - Math.cos((this.blockLiftProgress * Math.PI) / 2);
      const y = Phaser.Math.Linear(this.blockLiftStartY, this.blockLiftTargetY, easedProgress);

      this.weightBlockObject.body.reset(this.weightBlockObject.x, Math.round(y));
      this.weightBlockObject.body.setVelocity(0, 0);

      if (this.blockLiftProgress >= 1) {
        this.blockLifting = false;
        this.weightBlockObject.body.reset(this.weightBlockObject.x, this.blockLiftTargetY);
        this.updateWeightBlockPushState();
      }
    }

    if (this.level2LockSequenceActive && !this.level2DoorUnlocked) {
      this.level2LockElapsed = Math.min(
        this.level2LockElapsed + delta,
        LOCK_WHITE_DURATION_MS + LOCK_SHATTER_DURATION_MS
      );

      if (this.level2LockElapsed >= LOCK_WHITE_DURATION_MS + LOCK_SHATTER_DURATION_MS) {
        this.level2LockBroken = true;
        this.level2DoorUnlocked = true;
        this.level2LockSequenceActive = false;
        this.rebuildPhysicsSolids();
      }
    }
  }

  updateLevel4MovingBlock(delta) {
    if (this.gameState !== 'level4' || this.level4EndActive) {
      return;
    }

    const movement = this.getLevel4MoveSpeedUnits() * UNIT * (delta / 1000);

    this.level4MovingBlockOffset += this.level4MovingBlockDirection * movement;

    if (this.level4MovingBlockOffset >= LEVEL4_MOVING_BLOCK_RANGE) {
      this.level4MovingBlockOffset = LEVEL4_MOVING_BLOCK_RANGE;
      this.level4MovingBlockDirection = -1;
    } else if (this.level4MovingBlockOffset <= 0) {
      this.level4MovingBlockOffset = 0;
      this.level4MovingBlockDirection = 1;
    }

    this.syncLevel4HazardSensor();
  }

  syncLevel4HazardSensor() {
    if (!this.level4HazardSensor?.body) {
      return;
    }

    const block = this.getLevel4MovingBlockBounds();

    this.level4HazardSensor.setPosition(block.x, block.y);
    this.level4HazardSensor.body.setSize(block.width, block.height);
    this.level4HazardSensor.body.updateFromGameObject();

    if (this.player?.body?.enable) {
      this.physics.overlap(
        this.player,
        this.level4HazardSensor,
        this.handleLevel4HazardOverlap,
        null,
        this
      );
    }
  }

  updateLevel4End(delta) {
    if (!this.level4EndActive) {
      return;
    }

    this.level4EndElapsed = Math.min(
      this.level4EndElapsed + delta,
      END_ANIMATION_DURATION_MS
    );
    this.positionEndText();
    this.syncPlayerState();
    this.positionNickname();
  }

  createPixelText(text, fontSize) {
    return this.add
      .text(0, 0, text, {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: `${fontSize}px`,
        fontStyle: '700'
      })
      .setScrollFactor(0)
      .setResolution(1)
      .setDepth(5);
  }

  createUiTexts() {
    return {
      remark: this.createPixelText(REMARK_TEXT, 12).setOrigin(0, 0),
      title: this.createPixelText('Point Shift', 36).setOrigin(0.5),
      author: this.createPixelText('Ariakage', 22).setOrigin(0.5),
      level: this.createPixelText('LEVEL 1', 18).setOrigin(1, 0)
    };
  }

  createPlayer() {
    this.player = this.add
      .rectangle(this.playerPosition.x, this.playerPosition.y, UNIT, UNIT, PLAYER_COLOR, 1)
      .setOrigin(0, 0)
      .setDepth(4);
    this.physics.add.existing(this.player);
    this.player.body.setSize(UNIT, UNIT);
    this.player.body.setOffset(0, 0);
    this.player.body.setBounce(0, 0);
    this.player.body.setCollideWorldBounds(false);
  }

  getInitialPlayerPosition() {
    const { width, height } = this.scale.gameSize;
    const horizon = this.getHorizonBounds(height);

    return {
      x: Math.floor((width - UNIT) / 2),
      y: Math.max(0, Math.floor(horizon.y - UNIT - START_HEIGHT_UNITS * UNIT))
    };
  }

  paintBlack() {
    const { width, height } = this.scale.gameSize;

    this.blackFill.clear();
    this.blackFill.fillStyle(0x000000, 1);
    this.blackFill.fillRect(0, 0, width, height);
  }

  getHorizonBounds(height = this.scale.gameSize.height) {
    return {
      y: height - HORIZON_THICKNESS,
      height: HORIZON_THICKNESS
    };
  }

  drawHorizon() {
    const { width, height } = this.scale.gameSize;
    const horizon = this.getHorizonBounds(height);
    const roughness = Math.max(1, Math.floor(HORIZON_THICKNESS / 2));

    this.horizonGraphics.clear();
    this.horizonGraphics.fillStyle(PLAYER_COLOR, 1);
    this.horizonGraphics.fillRect(0, horizon.y, width, horizon.height);

    for (let x = 0; x < width; x += UNIT) {
      const bumpWidth = x % (2 * UNIT) === 0 ? Math.round(UNIT * 0.4) : Math.round(UNIT * 0.25);
      this.horizonGraphics.fillRect(x, horizon.y - roughness, bumpWidth, roughness);
    }
  }

  getLevel1ParkourBlocks(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    if (this.gameState !== 'level1') {
      return [];
    }

    const horizon = this.getHorizonBounds(height);
    const door = this.getDoorBounds(height, width);
    const wallX = Math.max(
      UNIT * 5,
      door.x - PARKOUR_DOOR_GAP - PARKOUR_WALL_WIDTH
    );
    const startX = Math.max(UNIT * 2, wallX - 12 * UNIT);
    const wallTop = horizon.y - PARKOUR_WALL_HEIGHT_UNITS * UNIT;
    const blocks = [
      {
        x: startX,
        y: horizon.y - UNIT,
        width: 3 * UNIT,
        height: UNIT,
        role: 'first-step'
      },
      {
        x: startX + 4 * UNIT,
        y: horizon.y - 2 * UNIT,
        width: 4 * UNIT,
        height: UNIT,
        role: 'middle-step'
      },
      {
        x: wallX - 4 * UNIT,
        y: wallTop,
        width: 4 * UNIT,
        height: UNIT,
        role: 'wall-approach'
      },
      {
        x: wallX,
        y: wallTop,
        width: PARKOUR_WALL_WIDTH,
        height: PARKOUR_WALL_HEIGHT_UNITS * UNIT,
        role: 'anti-cheat-wall'
      }
    ];

    return blocks.filter((block) => block.x + block.width > 0 && block.x < width);
  }

  drawPlatforms() {
    const blocks = this.getLevel1ParkourBlocks();

    this.platformGraphics.clear();
    this.platformGraphics.setVisible(this.gameState === 'level1');
    this.platformGraphics.fillStyle(PLAYER_COLOR, 1);

    for (const block of blocks) {
      this.platformGraphics.fillRect(block.x, block.y, block.width, block.height);
    }
  }

  getDoorBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const horizon = this.getHorizonBounds(height);
    const isLevel2 = this.gameState === 'level2';

    return {
      x: isLevel2 ? 0 : width - DOOR_WIDTH,
      y: horizon.y - DOOR_HEIGHT,
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      style: isLevel2 ? 'gray-one-way-pixel-outline' : DOOR_STYLE
    };
  }

  getLevel2LockedDoorBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const horizon = this.getHorizonBounds(height);

    return {
      x: width - DOOR_WIDTH,
      y: horizon.y - DOOR_HEIGHT,
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      style: 'gray-locked-pixel-outline'
    };
  }

  getLevel2WeightBlockBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const groundY = this.getGroundY(height);
    const currentBlock = this.getCurrentWeightBlockBounds();

    if (currentBlock) {
      return currentBlock;
    }

    return {
      x: Math.round(width * 0.52 - WEIGHT_BLOCK_SIZE / 2),
      y: groundY - UNIT,
      width: WEIGHT_BLOCK_SIZE,
      height: WEIGHT_BLOCK_SIZE,
      weight: this.getWeightBlockLabel()
    };
  }

  getLevel2ButtonBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const horizon = this.getHorizonBounds(height);
    const lockedDoor = this.getLevel2LockedDoorBounds(height, width);
    const pressProgress = this.buttonPressed ? 1 : this.buttonPressProgress;
    const buttonHeight = this.buttonPressed
      ? 0
      : Math.max(1, Math.round(BUTTON_HEIGHT * (1 - pressProgress * 0.78)));

    return {
      x: Math.max(DOOR_WIDTH + UNIT, lockedDoor.x - 4 * UNIT),
      y: horizon.y - buttonHeight,
      width: BUTTON_WIDTH,
      height: buttonHeight,
      pressed: this.buttonPressed
    };
  }

  getLevel3LeftDoorBounds(height = this.scale.gameSize.height) {
    const horizon = this.getHorizonBounds(height);

    return {
      x: 0,
      y: horizon.y - DOOR_HEIGHT,
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      style: 'gray-locked-entry-door'
    };
  }

  getLevel3RightDoorBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const horizon = this.getHorizonBounds(height);

    return {
      x: width - DOOR_WIDTH,
      y: horizon.y - DOOR_HEIGHT,
      width: DOOR_WIDTH,
      height: DOOR_HEIGHT,
      style: 'active-exit-door'
    };
  }

  getLevel3BlockBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const horizon = this.getHorizonBounds(height);

    return {
      x: Math.round(width / 2 - LEVEL3_BLOCK_SIZE / 2),
      y: horizon.y - LEVEL3_BLOCK_SIZE,
      width: LEVEL3_BLOCK_SIZE,
      height: LEVEL3_BLOCK_SIZE
    };
  }

  getLevel4LeftDoorBounds(height = this.scale.gameSize.height) {
    return this.getLevel3LeftDoorBounds(height);
  }

  getLevel4RightDoorBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    return this.getLevel3RightDoorBounds(height, width);
  }

  getLevel4MovingBlockBaseBounds(
    height = this.scale.gameSize.height,
    width = this.scale.gameSize.width
  ) {
    const horizon = this.getHorizonBounds(height);

    return {
      x: Math.round(width / 2 - LEVEL4_MOVING_BLOCK_WIDTH / 2),
      y: horizon.y - LEVEL4_MOVING_BLOCK_HEIGHT,
      width: LEVEL4_MOVING_BLOCK_WIDTH,
      height: LEVEL4_MOVING_BLOCK_HEIGHT
    };
  }

  getLevel4MovingBlockBounds(
    height = this.scale.gameSize.height,
    width = this.scale.gameSize.width
  ) {
    const base = this.getLevel4MovingBlockBaseBounds(height, width);

    return {
      ...base,
      y: Math.round(base.y - this.level4MovingBlockOffset),
      offsetUnits: this.level4MovingBlockOffset / UNIT
    };
  }

  getInitialLevel2WeightBlockBounds(height = this.scale.gameSize.height, width = this.scale.gameSize.width) {
    const groundY = this.getGroundY(height);

    return {
      x: Math.round(width * 0.52 - WEIGHT_BLOCK_SIZE / 2),
      y: groundY - UNIT,
      width: WEIGHT_BLOCK_SIZE,
      height: WEIGHT_BLOCK_SIZE,
      weight: this.getWeightBlockLabel()
    };
  }

  getCurrentWeightBlockBounds() {
    if (!this.weightBlockObject || this.gameState !== 'level2') {
      return null;
    }

    return {
      x: Math.round(this.weightBlockObject.x),
      y: Math.round(this.weightBlockObject.y),
      width: WEIGHT_BLOCK_SIZE,
      height: WEIGHT_BLOCK_SIZE,
      weight: this.getWeightBlockLabel()
    };
  }

  getWeightValueText() {
    const decimalIndex = Phaser.Math.Clamp(
      this.weightDecimalIndex,
      0,
      WEIGHT_BLOCK_DIGITS.length
    );

    if (decimalIndex === 0) {
      return `0.${WEIGHT_BLOCK_DIGITS}`;
    }

    if (decimalIndex >= WEIGHT_BLOCK_DIGITS.length) {
      return WEIGHT_BLOCK_DIGITS;
    }

    return `${WEIGHT_BLOCK_DIGITS.slice(0, decimalIndex)}.${WEIGHT_BLOCK_DIGITS.slice(decimalIndex)}`;
  }

  getWeightBlockLabel() {
    return `${this.getWeightValueText()}kg`;
  }

  getWeightBlockValueKg() {
    return Number.parseFloat(this.getWeightValueText());
  }

  canPlayerPushWeightBlock() {
    return this.getWeightBlockValueKg() <= PLAYER_PUSH_WEIGHT_KG;
  }

  isWeightBlockPushable() {
    return (
      this.canPlayerPushWeightBlock() &&
      !this.buttonPressing &&
      !this.buttonPressed &&
      !this.blockLifting
    );
  }

  getJumpHeightValueText() {
    const decimalIndex = Phaser.Math.Clamp(
      this.jumpHeightDecimalIndex,
      0,
      JUMP_HEIGHT_DIGITS.length
    );

    if (decimalIndex === 0) {
      return `0.${JUMP_HEIGHT_DIGITS}`;
    }

    if (decimalIndex >= JUMP_HEIGHT_DIGITS.length) {
      return JUMP_HEIGHT_DIGITS;
    }

    return `${JUMP_HEIGHT_DIGITS.slice(0, decimalIndex)}.${JUMP_HEIGHT_DIGITS.slice(decimalIndex)}`;
  }

  getJumpHeightUnits() {
    return Number.parseFloat(this.getJumpHeightValueText());
  }

  getJumpHeightLabel() {
    return `JUMP HEIGHT\n${this.getJumpHeightValueText()}unit`;
  }

  getLevel4MoveSpeedValueText() {
    const decimalIndex = Phaser.Math.Clamp(
      this.level4MoveSpeedDecimalIndex,
      0,
      LEVEL4_MOVE_SPEED_DIGITS.length
    );

    if (decimalIndex === 0) {
      return `0.${LEVEL4_MOVE_SPEED_DIGITS}`;
    }

    if (decimalIndex >= LEVEL4_MOVE_SPEED_DIGITS.length) {
      return LEVEL4_MOVE_SPEED_DIGITS;
    }

    return `${LEVEL4_MOVE_SPEED_DIGITS.slice(0, decimalIndex)}.${LEVEL4_MOVE_SPEED_DIGITS.slice(decimalIndex)}`;
  }

  getLevel4MoveSpeedUnits() {
    return Number.parseFloat(this.getLevel4MoveSpeedValueText());
  }

  getLevel4MoveSpeedLabel() {
    return `MOVE SPEED\n${this.getLevel4MoveSpeedValueText()}unit/s`;
  }

  getJumpSpeed() {
    if (this.gameState === 'level3') {
      return Math.sqrt(2 * GRAVITY * this.getJumpHeightUnits() * UNIT);
    }

    return JUMP_SPEED;
  }

  drawDoor() {
    this.doorGraphics.clear();

    if (this.gameState === 'level3') {
      const leftDoor = this.getLevel3LeftDoorBounds();
      const rightDoor = this.getLevel3RightDoorBounds();

      this.drawPixelDoor(leftDoor, DISABLED_DOOR_COLOR);
      this.drawLockIcon(leftDoor.x + leftDoor.width / 2, leftDoor.y - 28, DISABLED_DOOR_COLOR);
      this.drawPixelDoor(rightDoor, PLAYER_COLOR);
      return;
    }

    if (this.gameState === 'level4') {
      const leftDoor = this.getLevel4LeftDoorBounds();
      const rightDoor = this.getLevel4RightDoorBounds();

      this.drawPixelDoor(leftDoor, DISABLED_DOOR_COLOR);
      this.drawLockIcon(leftDoor.x + leftDoor.width / 2, leftDoor.y - 28, DISABLED_DOOR_COLOR);
      this.drawPixelDoor(rightDoor, PLAYER_COLOR);
      return;
    }

    const doorColor = this.gameState === 'level2' ? DISABLED_DOOR_COLOR : PLAYER_COLOR;
    this.drawPixelDoor(this.getDoorBounds(), doorColor);

    if (this.gameState === 'level2') {
      const lockedDoor = this.getLevel2LockedDoorBounds();
      const lockedDoorColor = this.level2DoorUnlocked ? PLAYER_COLOR : DISABLED_DOOR_COLOR;

      this.drawPixelDoor(lockedDoor, lockedDoorColor);
      this.drawLevel2Lock(lockedDoor.x + lockedDoor.width / 2, lockedDoor.y - 28);
    }
  }

  drawPixelDoor(door, doorColor) {
    this.doorGraphics.fillStyle(doorColor, 1);
    this.doorGraphics.fillRect(door.x, door.y, door.width, door.height);
    this.doorGraphics.fillStyle(0x000000, 1);
    this.doorGraphics.fillRect(door.x + 3, door.y + 3, door.width - 6, door.height - 3);
    this.doorGraphics.fillStyle(doorColor, 1);
    this.doorGraphics.fillRect(door.x + 6, door.y + 6, 3, door.height - 12);
    this.doorGraphics.fillRect(door.x + door.width - 9, door.y + 6, 3, door.height - 12);
  }

  drawLevel2Lock(centerX, y) {
    if (this.level2LockBroken) {
      return;
    }

    if (this.isLockShattering()) {
      this.drawLockShards(centerX, y, this.getLockShatterProgress());
      return;
    }

    const color = this.level2LockSequenceActive ? PLAYER_COLOR : DISABLED_DOOR_COLOR;
    this.drawLockIcon(centerX, y, color);
  }

  drawLockIcon(centerX, y, color = DISABLED_DOOR_COLOR) {
    const left = Math.round(centerX - 8);

    this.doorGraphics.fillStyle(0x000000, 1);
    this.doorGraphics.fillRect(left - 2, y - 2, 20, 28);
    this.doorGraphics.fillStyle(color, 1);
    this.doorGraphics.fillRect(left + 4, y, 8, 3);
    this.doorGraphics.fillRect(left + 1, y + 3, 3, 9);
    this.doorGraphics.fillRect(left + 12, y + 3, 3, 9);
    this.doorGraphics.fillRect(left, y + 11, 16, 13);
    this.doorGraphics.fillStyle(0x000000, 1);
    this.doorGraphics.fillRect(left + 4, y + 15, 8, 5);
  }

  isLockShattering() {
    return (
      this.level2LockSequenceActive &&
      this.level2LockElapsed >= LOCK_WHITE_DURATION_MS
    );
  }

  getLockShatterProgress() {
    return Phaser.Math.Clamp(
      (this.level2LockElapsed - LOCK_WHITE_DURATION_MS) / LOCK_SHATTER_DURATION_MS,
      0,
      1
    );
  }

  drawLockShards(centerX, y, progress) {
    const left = Math.round(centerX - 8);
    const pieces = [
      { x: 4, y: 0, w: 8, h: 3, dx: -18, dy: -14 },
      { x: 1, y: 3, w: 3, h: 9, dx: -24, dy: -4 },
      { x: 12, y: 3, w: 3, h: 9, dx: 22, dy: -5 },
      { x: 0, y: 11, w: 6, h: 13, dx: -16, dy: 16 },
      { x: 6, y: 11, w: 5, h: 13, dx: 2, dy: 22 },
      { x: 11, y: 11, w: 5, h: 13, dx: 18, dy: 14 }
    ];

    this.doorGraphics.fillStyle(PLAYER_COLOR, 1 - progress * 0.65);

    for (const piece of pieces) {
      this.doorGraphics.fillRect(
        left + piece.x + piece.dx * progress,
        y + piece.y + piece.dy * progress,
        piece.w,
        piece.h
      );
    }
  }

  drawLevelObjects() {
    const isLevel2 = this.gameState === 'level2';
    const isLevel3 = this.gameState === 'level3';
    const isLevel4 = this.gameState === 'level4' && !this.level4EndActive;

    this.levelObjectGraphics.clear();
    this.levelObjectGraphics.setVisible(isLevel2 || isLevel3 || isLevel4);
    this.weightBlockText.setVisible(isLevel2);
    this.jumpHeightText.setVisible(isLevel3 || isLevel4);

    if (isLevel3) {
      const { width, height } = this.scale.gameSize;
      const block = this.getLevel3BlockBounds(height, width);

      this.levelObjectGraphics.fillStyle(0x000000, 1);
      this.levelObjectGraphics.fillRect(block.x, block.y, block.width, block.height);
      this.levelObjectGraphics.lineStyle(2, PLAYER_COLOR, 1);
      this.levelObjectGraphics.strokeRect(block.x, block.y, block.width, block.height);
      this.jumpHeightText
        .setText(this.getJumpHeightLabel())
        .setPosition(width - 32, Math.max(150, Math.round(height * 0.38)));
      return;
    }

    if (isLevel4) {
      const { width, height } = this.scale.gameSize;
      const block = this.getLevel4MovingBlockBounds(height, width);

      this.levelObjectGraphics.fillStyle(0x000000, 1);
      this.levelObjectGraphics.fillRect(block.x, block.y, block.width, block.height);
      this.levelObjectGraphics.lineStyle(2, PLAYER_COLOR, 1);
      this.levelObjectGraphics.strokeRect(block.x, block.y, block.width, block.height);
      this.jumpHeightText
        .setText(this.getLevel4MoveSpeedLabel())
        .setPosition(width - 32, Math.max(150, Math.round(height * 0.38)));
      return;
    }

    if (!isLevel2) {
      return;
    }

    const block = this.getLevel2WeightBlockBounds();
    const button = this.getLevel2ButtonBounds();

    if (!this.buttonPressed) {
      this.levelObjectGraphics.fillStyle(DISABLED_DOOR_COLOR, 1);
      this.levelObjectGraphics.fillRect(button.x, button.y, button.width, button.height);
      this.levelObjectGraphics.lineStyle(1, PLAYER_COLOR, 1);
      this.levelObjectGraphics.strokeRect(button.x, button.y, button.width, button.height);
    }

    this.levelObjectGraphics.fillStyle(0x000000, 1);
    this.levelObjectGraphics.fillRect(block.x, block.y, block.width, block.height);
    this.levelObjectGraphics.lineStyle(2, PLAYER_COLOR, 1);
    this.levelObjectGraphics.strokeRect(block.x, block.y, block.width, block.height);
    this.weightBlockText.setText(this.getWeightBlockLabel());
    this.weightBlockText.setPosition(
      block.x + block.width / 2,
      block.y + block.height / 2
    );
  }

  handleWeightTextPointerDown(pointer) {
    if (this.gameState !== 'level2') {
      return;
    }

    const isRightClick = pointer.event?.button === 2;
    this.shiftWeightDecimal(isRightClick ? 1 : -1);
  }

  shiftWeightDecimal(direction) {
    const nextDecimalIndex = Phaser.Math.Clamp(
      this.weightDecimalIndex + direction,
      0,
      WEIGHT_BLOCK_DIGITS.length
    );

    if (nextDecimalIndex === this.weightDecimalIndex) {
      return;
    }

    this.weightDecimalIndex = nextDecimalIndex;
    this.weightBlockText.setText(this.getWeightBlockLabel());
    this.updateWeightBlockPushState();
    this.positionLevel2GuideText();
    this.drawLevelObjects();
  }

  handleRightSideNumberPointerDown(pointer) {
    if (!['level3', 'level4'].includes(this.gameState) || this.level4EndActive) {
      return;
    }

    const isRightClick = pointer.event?.button === 2;

    if (this.gameState === 'level3') {
      this.shiftJumpHeightDecimal(isRightClick ? 1 : -1);
      return;
    }

    this.shiftLevel4MoveSpeedDecimal(isRightClick ? 1 : -1);
  }

  shiftJumpHeightDecimal(direction) {
    const nextDecimalIndex = Phaser.Math.Clamp(
      this.jumpHeightDecimalIndex + direction,
      0,
      JUMP_HEIGHT_DIGITS.length
    );

    if (nextDecimalIndex === this.jumpHeightDecimalIndex) {
      return;
    }

    this.jumpHeightDecimalIndex = nextDecimalIndex;
    this.jumpHeightText.setText(this.getJumpHeightLabel());
    this.positionLevel3GuideText();
    this.drawLevelObjects();
  }

  shiftLevel4MoveSpeedDecimal(direction) {
    const nextDecimalIndex = Phaser.Math.Clamp(
      this.level4MoveSpeedDecimalIndex + direction,
      0,
      LEVEL4_MOVE_SPEED_DIGITS.length
    );

    if (nextDecimalIndex === this.level4MoveSpeedDecimalIndex) {
      return;
    }

    this.level4MoveSpeedDecimalIndex = nextDecimalIndex;
    this.jumpHeightText.setText(this.getLevel4MoveSpeedLabel());
    this.positionLevel3GuideText();
    this.drawLevelObjects();
  }

  rebuildPhysicsSolids() {
    this.clearPhysicsSolids();

    const { width, height } = this.scale.gameSize;
    const horizon = this.getHorizonBounds(height);
    const ground = this.addStaticPhysicsRect(0, horizon.y, width, 2 * UNIT);

    this.staticColliders.push(this.physics.add.collider(this.player, ground));

    for (const block of this.getLevel1ParkourBlocks(height, width)) {
      const platform = this.addStaticPhysicsRect(block.x, block.y, block.width, block.height);
      this.staticColliders.push(this.physics.add.collider(this.player, platform));
    }

    if (this.gameState === 'level2') {
      const lockedDoor = this.getLevel2LockedDoorBounds(height, width);
      let lockedDoorSolid = null;

      if (this.level2DoorUnlocked) {
        this.level2ExitSensor = this.add
          .rectangle(lockedDoor.x, lockedDoor.y, lockedDoor.width, lockedDoor.height, PLAYER_COLOR, 0)
          .setOrigin(0, 0)
          .setVisible(false);
        this.physics.add.existing(this.level2ExitSensor, true);
        this.level2ExitSensor.body.setSize(lockedDoor.width, lockedDoor.height);
        this.level2ExitSensor.body.updateFromGameObject();
        this.level2ExitOverlap = this.physics.add.overlap(
          this.player,
          this.level2ExitSensor,
          this.handleLevel2ExitOverlap,
          null,
          this
        );
      } else {
        lockedDoorSolid = this.addStaticPhysicsRect(
          lockedDoor.x,
          lockedDoor.y,
          lockedDoor.width,
          lockedDoor.height
        );
        this.staticColliders.push(this.physics.add.collider(this.player, lockedDoorSolid));
      }

      this.setupWeightBlockPhysics();
      this.staticColliders.push(this.physics.add.collider(this.player, this.weightBlockObject));
      this.staticColliders.push(this.physics.add.collider(this.weightBlockObject, ground));

      if (lockedDoorSolid) {
        this.staticColliders.push(this.physics.add.collider(this.weightBlockObject, lockedDoorSolid));
      }

      if (!this.buttonPressed) {
        const button = this.getLevel2ButtonBounds(height, width);

        this.buttonSensor = this.add
          .rectangle(button.x, button.y, button.width, button.height, PLAYER_COLOR, 0)
          .setOrigin(0, 0)
          .setVisible(false);
        this.physics.add.existing(this.buttonSensor, true);
        this.buttonSensor.body.setSize(button.width, button.height);
        this.buttonSensor.body.updateFromGameObject();
        this.buttonOverlap = this.physics.add.overlap(
          this.weightBlockObject,
          this.buttonSensor,
          this.handleButtonPressed,
          null,
          this
        );
      }
    }

    if (this.gameState === 'level3') {
      const leftDoor = this.getLevel3LeftDoorBounds(height);
      const rightDoor = this.getLevel3RightDoorBounds(height, width);
      const centerBlock = this.getLevel3BlockBounds(height, width);
      const leftDoorSolid = this.addStaticPhysicsRect(
        leftDoor.x,
        leftDoor.y,
        leftDoor.width,
        leftDoor.height
      );
      const centerBlockSolid = this.addStaticPhysicsRect(
        centerBlock.x,
        centerBlock.y,
        centerBlock.width,
        centerBlock.height
      );

      this.staticColliders.push(this.physics.add.collider(this.player, leftDoorSolid));
      this.staticColliders.push(this.physics.add.collider(this.player, centerBlockSolid));
      this.level3ExitSensor = this.add
        .rectangle(rightDoor.x, rightDoor.y, rightDoor.width, rightDoor.height, PLAYER_COLOR, 0)
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(this.level3ExitSensor, true);
      this.level3ExitSensor.body.setSize(rightDoor.width, rightDoor.height);
      this.level3ExitSensor.body.updateFromGameObject();
      this.level3ExitOverlap = this.physics.add.overlap(
        this.player,
        this.level3ExitSensor,
        this.handleLevel3ExitOverlap,
        null,
        this
      );
    }

    if (this.gameState === 'level4' && !this.level4EndActive) {
      const leftDoor = this.getLevel4LeftDoorBounds(height);
      const rightDoor = this.getLevel4RightDoorBounds(height, width);
      const hazardBlock = this.getLevel4MovingBlockBounds(height, width);
      const leftDoorSolid = this.addStaticPhysicsRect(
        leftDoor.x,
        leftDoor.y,
        leftDoor.width,
        leftDoor.height
      );

      this.staticColliders.push(this.physics.add.collider(this.player, leftDoorSolid));
      this.level4HazardSensor = this.add
        .rectangle(
          hazardBlock.x,
          hazardBlock.y,
          hazardBlock.width,
          hazardBlock.height,
          PLAYER_COLOR,
          0
        )
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(this.level4HazardSensor, true);
      this.level4HazardSensor.body.setSize(hazardBlock.width, hazardBlock.height);
      this.level4HazardSensor.body.updateFromGameObject();
      this.level4HazardOverlap = this.physics.add.overlap(
        this.player,
        this.level4HazardSensor,
        this.handleLevel4HazardOverlap,
        null,
        this
      );
      this.level4ExitSensor = this.add
        .rectangle(rightDoor.x, rightDoor.y, rightDoor.width, rightDoor.height, PLAYER_COLOR, 0)
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(this.level4ExitSensor, true);
      this.level4ExitSensor.body.setSize(rightDoor.width, rightDoor.height);
      this.level4ExitSensor.body.updateFromGameObject();
      this.level4ExitOverlap = this.physics.add.overlap(
        this.player,
        this.level4ExitSensor,
        this.handleLevel4ExitOverlap,
        null,
        this
      );
    }

    if (this.gameState === 'level1') {
      const door = this.getDoorBounds(height, width);

      this.doorSensor = this.add
        .rectangle(door.x, door.y, door.width, door.height, PLAYER_COLOR, 0)
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(this.doorSensor, true);
      this.doorSensor.body.setSize(door.width, door.height);
      this.doorSensor.body.updateFromGameObject();
      this.doorOverlap = this.physics.add.overlap(
        this.player,
        this.doorSensor,
        this.handleDoorOverlap,
        null,
        this
      );
    }
  }

  addStaticPhysicsRect(x, y, width, height) {
    const rect = this.add
      .rectangle(x, y, width, height, PLAYER_COLOR, 0)
      .setOrigin(0, 0)
      .setVisible(false);

    this.physics.add.existing(rect, true);
    rect.body.setSize(width, height);
    rect.body.updateFromGameObject();
    this.staticPhysicsObjects.push(rect);

    return rect;
  }

  setupWeightBlockPhysics() {
    if (!this.weightBlockObject) {
      const block = this.getInitialLevel2WeightBlockBounds();

      this.weightBlockObject = this.add
        .rectangle(block.x, block.y, block.width, block.height, PLAYER_COLOR, 0)
        .setOrigin(0, 0)
        .setVisible(false);
      this.physics.add.existing(this.weightBlockObject);
      this.weightBlockObject.body.setSize(block.width, block.height);
      this.weightBlockObject.body.setOffset(0, 0);
      this.weightBlockObject.body.setBounce(0, 0);
      this.weightBlockObject.body.setDragX(80 * UNIT);
      this.weightBlockObject.body.setMaxVelocity(PLAYER_SPEED * 0.6, GRAVITY);
      this.weightBlockObject.body.setCollideWorldBounds(true);
    }

    this.updateWeightBlockPushState();
  }

  updateWeightBlockPushState() {
    if (!this.weightBlockObject?.body) {
      return;
    }

    const body = this.weightBlockObject.body;
    const canPush = this.isWeightBlockPushable();

    body.moves = canPush;
    body.immovable = !canPush;
    body.allowGravity = canPush;
    body.pushable = canPush;
    body.mass = Math.max(0.1, this.getWeightBlockValueKg());

    if (!canPush) {
      body.setVelocity(0, 0);
    }
  }

  settleWeightBlockMotion() {
    if (!this.weightBlockObject?.body || !this.weightBlockObject.body.moves) {
      return;
    }

    const body = this.weightBlockObject.body;
    const playerIsPushing =
      Math.abs(this.player.body.velocity.x) > 0 &&
      (body.touching.left || body.touching.right);

    if (playerIsPushing) {
      return;
    }

    body.setVelocityX(body.velocity.x * 0.45);

    if (Math.abs(body.velocity.x) < UNIT) {
      body.setVelocityX(0);
    }
  }

  handleButtonPressed() {
    if (
      this.buttonPressing ||
      this.buttonPressed ||
      this.level2DoorUnlocked ||
      this.gameState !== 'level2'
    ) {
      return;
    }

    this.buttonPressing = true;
    this.buttonPressProgress = 0;
    this.level2LockSequenceActive = true;
    this.level2LockElapsed = 0;

    if (this.buttonOverlap) {
      this.buttonOverlap.destroy();
      this.buttonOverlap = null;
    }

    if (this.buttonSensor) {
      this.buttonSensor.destroy();
      this.buttonSensor = null;
    }

    this.weightBlockObject.body.setVelocity(0, 0);
    this.updateWeightBlockPushState();
    this.drawDoor();
    this.drawLevelObjects();
    this.positionLevel2GuideText();
  }

  startBlockLift() {
    if (!this.weightBlockObject?.body) {
      return;
    }

    this.blockLifting = true;
    this.blockLiftProgress = 0;
    this.blockLiftStartY = Math.round(this.weightBlockObject.y);
    this.blockLiftTargetY = this.blockLiftStartY - UNIT;
    this.weightBlockObject.body.setVelocity(0, 0);
    this.updateWeightBlockPushState();
  }

  finishBlockLiftImmediately() {
    if (!this.weightBlockObject?.body) {
      return;
    }

    const x = Math.round(this.weightBlockObject.x);
    const y = Math.round(this.blockLiftTargetY || this.weightBlockObject.y);

    this.weightBlockObject.body.reset(x, y);
    this.weightBlockObject.body.setVelocity(0, 0);
    this.updateWeightBlockPushState();
    this.drawLevelObjects();
    this.positionLevel2GuideText();
  }

  clearPhysicsSolids() {
    for (const collider of this.staticColliders) {
      collider.destroy();
    }
    this.staticColliders = [];

    if (this.doorOverlap) {
      this.doorOverlap.destroy();
      this.doorOverlap = null;
    }

    if (this.doorSensor) {
      this.doorSensor.destroy();
      this.doorSensor = null;
    }

    if (this.buttonOverlap) {
      this.buttonOverlap.destroy();
      this.buttonOverlap = null;
    }

    if (this.buttonSensor) {
      this.buttonSensor.destroy();
      this.buttonSensor = null;
    }

    if (this.level2ExitOverlap) {
      this.level2ExitOverlap.destroy();
      this.level2ExitOverlap = null;
    }

    if (this.level2ExitSensor) {
      this.level2ExitSensor.destroy();
      this.level2ExitSensor = null;
    }

    if (this.level3ExitOverlap) {
      this.level3ExitOverlap.destroy();
      this.level3ExitOverlap = null;
    }

    if (this.level3ExitSensor) {
      this.level3ExitSensor.destroy();
      this.level3ExitSensor = null;
    }

    if (this.level4ExitOverlap) {
      this.level4ExitOverlap.destroy();
      this.level4ExitOverlap = null;
    }

    if (this.level4ExitSensor) {
      this.level4ExitSensor.destroy();
      this.level4ExitSensor = null;
    }

    if (this.level4HazardOverlap) {
      this.level4HazardOverlap.destroy();
      this.level4HazardOverlap = null;
    }

    if (this.level4HazardSensor) {
      this.level4HazardSensor.destroy();
      this.level4HazardSensor = null;
    }

    for (const object of this.staticPhysicsObjects) {
      object.destroy();
    }
    this.staticPhysicsObjects = [];
  }

  handleResize() {
    const { width, height } = this.scale.gameSize;
    const groundY = this.getGroundY(height);
    const x = Phaser.Math.Clamp(
      this.player.x,
      this.getMinimumPlayerX(),
      Math.max(0, width - UNIT)
    );
    const y = Math.min(this.player.y, groundY);

    this.physics.world.setBounds(0, 0, width, height);
    this.setPlayerPosition(x, y);
    this.paintBlack();
    this.drawHorizon();
    this.drawPlatforms();
    this.drawDoor();
    this.drawLevelObjects();
    this.rebuildPhysicsSolids();
    this.drawTrail();
    this.positionUiTexts();
    this.drawControlsGuide();

    if (this.level4EndActive) {
      this.setPlayerPosition(Math.round(width / 2 - UNIT / 2), Math.round(height / 2 - UNIT / 2));
      this.player.body.enable = false;
    }

    this.positionNickname();
  }

  positionUiTexts() {
    const { width, height } = this.scale.gameSize;

    this.uiTexts.level.setText(this.getLevelLabel());
    this.uiTexts.remark.setWordWrapWidth(this.getRemarkWrapWidth(width), true);
    this.uiTexts.remark.setPosition(24, 24);
    this.uiTexts.title.setPosition(Math.round(width / 2), Math.round(height * 0.34));
    this.uiTexts.author.setPosition(Math.round(width / 2), Math.round(height * 0.34 + 78));
    this.uiTexts.level.setPosition(width - 24, 24);
    this.positionEndText();
    this.positionLevel2GuideText();
    this.positionLevel3GuideText();
  }

  positionLevel2GuideText() {
    const { height } = this.scale.gameSize;
    const canPush = this.canPlayerPushWeightBlock();
    let status = canPush ? 'PUSHABLE' : 'TOO HEAVY';

    if (this.level2DoorUnlocked) {
      status = 'DOOR OPEN';
    } else if (this.isLockShattering()) {
      status = 'LOCK BREAKING';
    } else if (this.blockLifting) {
      status = 'BLOCK LIFTING';
    } else if (this.buttonPressing) {
      status = 'BUTTON PRESSING';
    } else if (this.buttonPressed) {
      status = 'BUTTON PRESSED';
    }

    this.level2GuideText
      .setText(
        [
          'WEIGHT NOTE',
          `Dot push power: ${PLAYER_PUSH_WEIGHT_KG}kg`,
          `Block weight: ${this.getWeightBlockLabel()}`,
          'Click block number:',
          'Left click  : decimal left',
          'Right click : decimal right',
          'Push block onto button',
          'Only block can press it',
          `Status: ${status}`
        ].join('\n')
      )
      .setPosition(32, Math.max(150, Math.round(height * 0.38)))
      .setVisible(this.gameState === 'level2');
  }

  positionLevel3GuideText() {
    const { height } = this.scale.gameSize;

    if (this.gameState === 'level3') {
      this.level3GuideText
        .setText(
          [
            'JUMP NOTE',
            `Jump height: ${this.getJumpHeightValueText()}unit`,
            'Click right number:',
            'Left click  : decimal left',
            'Right click : decimal right',
            'Cross the right door',
            'to enter LEVEL 4'
          ].join('\n')
        )
        .setPosition(32, Math.max(150, Math.round(height * 0.38)))
        .setVisible(true);
      return;
    }

    if (this.gameState !== 'level4' || this.level4EndActive) {
      this.level3GuideText.setVisible(false);
      return;
    }

    this.level3GuideText
      .setText(
        [
          'MOVING BLOCK NOTE',
          `Speed: ${this.getLevel4MoveSpeedValueText()}unit/s`,
          'Touching the block resets Dot',
          'Click right number:',
          'Left click  : decimal left',
          'Right click : decimal right',
          'Cross the right door',
          'to end the game'
        ].join('\n')
      )
      .setPosition(32, Math.max(150, Math.round(height * 0.38)))
      .setVisible(true);
  }

  getLevelLabel() {
    if (this.gameState === 'level4') {
      return 'LEVEL 4';
    }

    if (this.gameState === 'level3') {
      return 'LEVEL 3';
    }

    if (this.gameState === 'level2') {
      return 'LEVEL 2';
    }

    return 'LEVEL 1';
  }

  drawControlsGuide() {
    const { height } = this.scale.gameSize;
    const isVisible = this.gameState === 'level1';
    const x = 32;
    const y = Math.max(145, Math.round(height * 0.42));
    const boxWidth = 252;
    const boxHeight = 134;

    this.controlsGuideGraphics.clear();
    this.controlsGuideGraphics.setVisible(isVisible);

    for (const text of this.controlsGuideTexts) {
      text.destroy();
    }
    this.controlsGuideTexts = [];

    if (!isVisible) {
      return;
    }

    this.controlsGuideGraphics.fillStyle(0x000000, 0.9);
    this.controlsGuideGraphics.fillRect(x, y, boxWidth, boxHeight);
    this.controlsGuideGraphics.lineStyle(2, PLAYER_COLOR, 1);
    this.controlsGuideGraphics.strokeRect(x, y, boxWidth, boxHeight);

    this.addGuideText('CONTROL NOTE', x + 12, y + 12, 13, 0, 0);
    this.addGuideText('MOVE', x + 14, y + 47, 12, 0, 0.5);
    this.addKeyBox('A', x + 70, y + 34, 28, 28);
    this.addKeyBox('D', x + 106, y + 34, 28, 28);
    this.addKeyBox('LEFT', x + 144, y + 34, 42, 28);
    this.addKeyBox('RIGHT', x + 194, y + 34, 48, 28);

    this.addGuideText('JUMP', x + 14, y + 91, 12, 0, 0.5);
    this.addKeyBox('W', x + 70, y + 78, 28, 28);
    this.addKeyBox('UP', x + 106, y + 78, 32, 28);
    this.addKeyBox('SPACE', x + 148, y + 78, 76, 28);
  }

  addGuideText(text, x, y, fontSize, originX = 0, originY = 0) {
    const textObject = this.add
      .text(x, y, text, {
        color: TEXT_COLOR,
        fontFamily: PIXEL_FONT,
        fontSize: `${fontSize}px`,
        fontStyle: '700'
      })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(6)
      .setResolution(1);

    this.controlsGuideTexts.push(textObject);
    return textObject;
  }

  addKeyBox(label, x, y, width, height) {
    this.controlsGuideGraphics.lineStyle(2, PLAYER_COLOR, 1);
    this.controlsGuideGraphics.strokeRect(x, y, width, height);
    this.addGuideText(label, x + width / 2, y + height / 2, 10, 0.5, 0.5);
  }

  getRemarkWrapWidth(width) {
    return Math.max(160, Math.min(MAX_REMARK_WRAP_WIDTH, width - 220));
  }

  getMovementDirection() {
    const movingLeft = this.keys.left.isDown || this.cursors.left.isDown;
    const movingRight = this.keys.right.isDown || this.cursors.right.isDown;

    return Number(movingRight) - Number(movingLeft);
  }

  applyPlayerBounds() {
    const { width } = this.scale.gameSize;
    const body = this.player.body;
    const minX = this.getMinimumPlayerX();
    const maxX = Math.max(0, width - UNIT);
    const clampedX = Phaser.Math.Clamp(this.player.x, minX, maxX);

    if (clampedX !== this.player.x) {
      const velocityY = body.velocity.y;

      body.reset(clampedX, this.player.y);
      body.setVelocity(0, velocityY);
    }
  }

  getMinimumPlayerX() {
    return ['level2', 'level3', 'level4'].includes(this.gameState) ? DOOR_WIDTH : 0;
  }

  getPlayerBounds(x = this.playerPosition.x, y = this.playerPosition.y) {
    return {
      x,
      y,
      width: UNIT,
      height: UNIT
    };
  }

  handleDoorOverlap() {
    if (this.gameState !== 'level1' || this.transition.active) {
      return;
    }

    this.startLevelTransition();
  }

  startLevelTransition() {
    this.gameState = 'level2';
    this.transition.active = true;
    this.transition.elapsed = 1;
    this.transition.offsetX = -1;
    this.transition.startScrollX = this.cameras.main.scrollX;
    this.transition.targetState = 'level2';
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.cameras.main.scrollX = this.transition.startScrollX + 1;
  }

  handleLevel2ExitOverlap() {
    if (
      this.gameState !== 'level2' ||
      this.transition.active ||
      !this.level2DoorUnlocked
    ) {
      return;
    }

    this.startLevel3Transition();
  }

  startLevel3Transition() {
    this.gameState = 'level3';
    this.transition.active = true;
    this.transition.elapsed = 1;
    this.transition.offsetX = -1;
    this.transition.startScrollX = this.cameras.main.scrollX;
    this.transition.targetState = 'level3';
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.cameras.main.scrollX = this.transition.startScrollX + 1;
  }

  handleLevel3ExitOverlap() {
    if (this.gameState !== 'level3' || this.transition.active) {
      return;
    }

    this.startLevel4Transition();
  }

  handleLevel4HazardOverlap() {
    if (this.gameState !== 'level4' || this.transition.active || this.level4EndActive) {
      return;
    }

    this.resetPlayerToCurrentLevelStart();
  }

  resetPlayerToCurrentLevelStart() {
    const groundY = this.getGroundY();

    this.trailSamples = [];
    this.setPlayerPosition(this.getMinimumPlayerX(), groundY);
    this.drawTrail();
    this.positionNickname();
  }

  handleLevel4ExitOverlap() {
    if (this.gameState !== 'level4' || this.transition.active || this.level4EndActive) {
      return;
    }

    this.startLevel4EndSequence();
  }

  startLevel4EndSequence() {
    const { width, height } = this.scale.gameSize;
    const centerX = Math.round(width / 2 - UNIT / 2);
    const centerY = Math.round(height / 2 - UNIT / 2);

    this.level4EndActive = true;
    this.level4EndElapsed = 0;
    this.trailSamples = [];
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.jumpHeightText.setVisible(false);
    this.level3GuideText.setVisible(false);
    this.levelObjectGraphics.setVisible(false);
    this.clearPhysicsSolids();
    this.drawTrail();
    this.positionEndText();
    this.endText.setAlpha(0).setScale(0.2).setVisible(true);

    this.tweens.killTweensOf([this.player, this.endText]);
    this.tweens.add({
      targets: this.player,
      x: centerX,
      y: centerY,
      duration: 650,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.syncPlayerState();
        this.positionNickname();
      },
      onComplete: () => {
        this.setPlayerPosition(centerX, centerY);
        this.player.body.enable = false;
      }
    });
    this.tweens.add({
      targets: this.endText,
      alpha: 1,
      scale: 1,
      duration: END_ANIMATION_DURATION_MS,
      ease: 'Back.easeOut',
      delay: 220
    });
  }

  positionEndText() {
    const { width, height } = this.scale.gameSize;

    this.endText.setPosition(Math.round(width / 2), Math.round(height / 2));
  }

  startLevel4Transition() {
    this.gameState = 'level4';
    this.transition.active = true;
    this.transition.elapsed = 1;
    this.transition.offsetX = -1;
    this.transition.startScrollX = this.cameras.main.scrollX;
    this.transition.targetState = 'level4';
    this.player.body.setVelocity(0, 0);
    this.player.body.enable = false;
    this.cameras.main.scrollX = this.transition.startScrollX + 1;
  }

  updateLevelTransition(delta) {
    this.transition.elapsed = Math.min(
      this.transition.elapsed + delta,
      this.transition.duration
    );

    const progress = this.transition.elapsed / this.transition.duration;
    const scrollX = Math.round(
      this.transition.startScrollX + this.scale.gameSize.width * progress
    );

    this.transition.offsetX = -(scrollX - this.transition.startScrollX);
    this.cameras.main.scrollX = scrollX;

    if (progress >= 1) {
      this.completeLevelTransition();
    }
  }

  completeLevelTransition() {
    this.transition.active = false;
    this.transition.offsetX = -this.scale.gameSize.width;
    this.cameras.main.scrollX = 0;

    if (this.transition.targetState === 'level3') {
      this.setupLevel3Scene();
      return;
    }

    if (this.transition.targetState === 'level4') {
      this.setupLevel4Scene();
      return;
    }

    this.setupLevel2Scene();
  }

  setupLevel2Scene() {
    const groundY = this.getGroundY();

    this.sceneEmpty = false;
    this.trailSamples = [];
    this.buttonPressing = false;
    this.buttonPressed = false;
    this.buttonPressProgress = 0;
    this.blockLifting = false;
    this.blockLiftProgress = 0;
    this.blockLiftStartY = 0;
    this.blockLiftTargetY = 0;
    this.level2LockSequenceActive = false;
    this.level2LockElapsed = 0;
    this.level2LockBroken = false;
    this.level2DoorUnlocked = false;
    this.level4EndActive = false;
    this.level4EndElapsed = 0;
    this.player.body.enable = true;
    this.setPlayerPosition(DOOR_WIDTH, groundY);

    this.trailGraphics.setVisible(true);
    this.horizonGraphics.setVisible(true);
    this.platformGraphics.setVisible(false);
    this.doorGraphics.setVisible(true);
    this.player.setVisible(true);
    this.nicknameText.setVisible(true);
    this.level3GuideText.setVisible(false);
    this.jumpHeightText.setVisible(false);
    this.endText.setVisible(false);
    this.uiTexts.remark.setVisible(true).setAlpha(1);
    this.uiTexts.level.setVisible(true).setAlpha(1).setText('LEVEL 2');
    this.uiTexts.title.setVisible(false);
    this.uiTexts.author.setVisible(false);

    this.paintBlack();
    this.drawHorizon();
    this.drawPlatforms();
    this.drawDoor();
    this.drawLevelObjects();
    this.rebuildPhysicsSolids();
    this.drawTrail();
    this.positionUiTexts();
    this.drawControlsGuide();
    this.positionNickname();
  }

  setupLevel3Scene() {
    const groundY = this.getGroundY();

    this.sceneEmpty = false;
    this.trailSamples = [];
    this.jumpHeightDecimalIndex = JUMP_HEIGHT_INITIAL_DECIMAL_INDEX;
    this.level4EndActive = false;
    this.level4EndElapsed = 0;
    this.player.body.enable = true;
    this.setPlayerPosition(DOOR_WIDTH, groundY);

    if (this.weightBlockObject?.body) {
      this.weightBlockObject.body.enable = false;
    }

    this.trailGraphics.setVisible(true);
    this.horizonGraphics.setVisible(true);
    this.platformGraphics.setVisible(false);
    this.levelObjectGraphics.setVisible(false);
    this.doorGraphics.setVisible(true);
    this.player.setVisible(true);
    this.nicknameText.setVisible(true);
    this.weightBlockText.setVisible(false);
    this.level2GuideText.setVisible(false);
    this.endText.setVisible(false);
    this.uiTexts.remark.setVisible(true).setAlpha(1);
    this.uiTexts.level.setVisible(true).setAlpha(1).setText('LEVEL 3');
    this.uiTexts.title.setVisible(false);
    this.uiTexts.author.setVisible(false);

    this.paintBlack();
    this.drawHorizon();
    this.drawPlatforms();
    this.drawDoor();
    this.drawLevelObjects();
    this.rebuildPhysicsSolids();
    this.drawTrail();
    this.positionUiTexts();
    this.drawControlsGuide();
    this.positionNickname();
  }

  setupLevel4Scene() {
    const groundY = this.getGroundY();

    this.sceneEmpty = false;
    this.trailSamples = [];
    this.level4MoveSpeedDecimalIndex = LEVEL4_MOVE_SPEED_INITIAL_DECIMAL_INDEX;
    this.level4MovingBlockOffset = 0;
    this.level4MovingBlockDirection = 1;
    this.level4EndActive = false;
    this.level4EndElapsed = 0;
    this.player.body.enable = true;
    this.setPlayerPosition(DOOR_WIDTH, groundY);

    if (this.weightBlockObject?.body) {
      this.weightBlockObject.body.enable = false;
    }

    this.trailGraphics.setVisible(true);
    this.horizonGraphics.setVisible(true);
    this.platformGraphics.setVisible(false);
    this.levelObjectGraphics.setVisible(false);
    this.doorGraphics.setVisible(true);
    this.player.setVisible(true);
    this.nicknameText.setVisible(true);
    this.weightBlockText.setVisible(false);
    this.level2GuideText.setVisible(false);
    this.level3GuideText.setVisible(false);
    this.jumpHeightText.setVisible(false);
    this.endText.setVisible(false);
    this.uiTexts.remark.setVisible(true).setAlpha(1);
    this.uiTexts.level.setVisible(true).setAlpha(1).setText('LEVEL 4');
    this.uiTexts.title.setVisible(false);
    this.uiTexts.author.setVisible(false);

    this.paintBlack();
    this.drawHorizon();
    this.drawPlatforms();
    this.drawDoor();
    this.drawLevelObjects();
    this.rebuildPhysicsSolids();
    this.drawTrail();
    this.positionUiTexts();
    this.drawControlsGuide();
    this.positionNickname();
  }

  startIntroFade() {
    this.introFadeActive = true;
  }

  updateIntroFade(delta) {
    if (!this.introFadeActive || this.introTextAlpha === 0) {
      return;
    }

    this.introTextAlpha = Phaser.Math.Clamp(
      this.introTextAlpha - delta / INTRO_FADE_DURATION_MS,
      0,
      1
    );
    this.uiTexts.title.setAlpha(this.introTextAlpha);
    this.uiTexts.author.setAlpha(this.introTextAlpha);
  }

  jump() {
    if (!this.player || !this.player.body.enable || !this.isPlayerGrounded()) {
      return;
    }

    this.player.body.setVelocityY(-this.getJumpSpeed());
    this.grounded = false;
  }

  isPlayerGrounded() {
    const body = this.player?.body;

    return Boolean(body && (body.blocked.down || body.touching.down));
  }

  setPlayerPosition(x, y) {
    this.player.setPosition(Math.round(x), Math.round(y));
    this.player.body.reset(this.player.x, this.player.y);
    this.player.body.setVelocity(0, 0);
    this.syncPlayerState();
  }

  syncPlayerState() {
    this.precisePlayerX = this.player.x;
    this.precisePlayerY = this.player.y;
    this.playerPosition.x = Math.round(this.player.x);
    this.playerPosition.y = Math.round(this.player.y);
    this.velocity.y = this.player.body.velocity.y;
    this.grounded = this.isPlayerGrounded();
  }

  getGroundY(height = this.scale.gameSize.height) {
    return this.getHorizonBounds(height).y - UNIT;
  }

  addTrailSample(x, y) {
    this.trailSamples.unshift({ x, y, age: 0 });

    if (this.trailSamples.length > MAX_TRAIL_SAMPLES) {
      this.trailSamples.length = MAX_TRAIL_SAMPLES;
    }
  }

  updateTrail(delta) {
    this.trailSamples = this.trailSamples
      .map((sample) => ({ ...sample, age: sample.age + delta }))
      .filter((sample) => sample.age < TRAIL_LIFETIME_MS);

    this.drawTrail();
  }

  drawTrail() {
    this.trailGraphics.clear();

    for (const sample of this.trailSamples) {
      const life = Phaser.Math.Clamp(1 - sample.age / TRAIL_LIFETIME_MS, 0, 1);
      const alpha =
        TRAIL_STYLE.minAlpha +
        (TRAIL_STYLE.maxAlpha - TRAIL_STYLE.minAlpha) * Math.pow(life, 1.7);
      const scale =
        TRAIL_STYLE.minScale +
        (TRAIL_STYLE.maxScale - TRAIL_STYLE.minScale) * Math.pow(life, 0.8);
      const size = Math.max(1, Math.round(UNIT * scale));
      const offset = Math.round((UNIT - size) / 2);

      this.trailGraphics.fillStyle(PLAYER_COLOR, alpha);
      this.trailGraphics.fillRect(sample.x + offset, sample.y + offset, size, size);
    }
  }

  positionNickname() {
    this.nicknameText.setPosition(
      this.playerPosition.x + UNIT / 2,
      this.playerPosition.y - NICKNAME_GAP
    );
  }

  getTextDebugState(textObject) {
    const bounds = textObject.getBounds();

    return {
      text: textObject.text,
      color: TEXT_COLOR,
      alpha: textObject.alpha,
      fontSize: Number.parseInt(textObject.style.fontSize, 10),
      x: Math.round(textObject.x),
      y: Math.round(textObject.y),
      bounds: {
        x: Math.max(0, Math.floor(bounds.x) - 4),
        y: Math.max(0, Math.floor(bounds.y) - 4),
        width: Math.ceil(bounds.width) + 8,
        height: Math.ceil(bounds.height) + 8
      }
    };
  }

  getVisibleGameplayObjectCount() {
    return [
      this.trailGraphics,
      this.horizonGraphics,
      this.platformGraphics,
      this.levelObjectGraphics,
      this.doorGraphics,
      this.player,
      this.nicknameText,
      this.weightBlockText,
      this.level2GuideText,
      this.level3GuideText,
      this.jumpHeightText,
      this.endText,
      this.controlsGuideGraphics,
      ...this.controlsGuideTexts,
      ...Object.values(this.uiTexts)
    ].filter((object) => object.visible).length;
  }

  attachDebugState() {
    window.__POINTSHIFT_DEBUG__ = {
      getState: () => ({
        gameState: this.gameState,
        unit: UNIT,
        nickname: PLAYER_NICKNAME,
        player: {
          x: this.playerPosition.x,
          y: this.playerPosition.y,
          width: UNIT,
          height: UNIT
        },
        door: this.getDoorBounds(),
        lockedDoor: this.gameState === 'level2' ? this.getLevel2LockedDoorBounds() : null,
        level3LeftDoor: this.gameState === 'level3' ? this.getLevel3LeftDoorBounds() : null,
        level3RightDoor: this.gameState === 'level3' ? this.getLevel3RightDoorBounds() : null,
        level3Block: this.gameState === 'level3' ? this.getLevel3BlockBounds() : null,
        jumpHeightState: {
          label: this.getJumpHeightLabel(),
          valueUnits: this.getJumpHeightUnits(),
          decimalIndex: this.jumpHeightDecimalIndex
        },
        level4LeftDoor: this.gameState === 'level4' ? this.getLevel4LeftDoorBounds() : null,
        level4RightDoor: this.gameState === 'level4' ? this.getLevel4RightDoorBounds() : null,
        level4MovingBlock: this.gameState === 'level4' ? this.getLevel4MovingBlockBounds() : null,
        level4MoveSpeedState: {
          label: this.getLevel4MoveSpeedLabel(),
          valueUnitsPerSecond: this.getLevel4MoveSpeedUnits(),
          decimalIndex: this.level4MoveSpeedDecimalIndex,
          offsetUnits: this.level4MovingBlockOffset / UNIT,
          direction: this.level4MovingBlockDirection
        },
        level4EndState: {
          active: this.level4EndActive,
          elapsed: this.level4EndElapsed,
          text: this.getTextDebugState(this.endText)
        },
        weightBlock: this.gameState === 'level2' ? this.getLevel2WeightBlockBounds() : null,
        floorButton: this.gameState === 'level2' ? this.getLevel2ButtonBounds() : null,
        weightBlockState: {
          label: this.getWeightBlockLabel(),
          valueKg: this.getWeightBlockValueKg(),
          playerPushWeightKg: PLAYER_PUSH_WEIGHT_KG,
          pushable: this.isWeightBlockPushable(),
          weightAllowed: this.canPlayerPushWeightBlock(),
          fixedByButton: this.buttonPressed,
          lifting: this.blockLifting,
          liftProgress: this.blockLiftProgress
        },
        level2Mechanism: {
          buttonPressing: this.buttonPressing,
          buttonPressed: this.buttonPressed,
          buttonProgress: this.buttonPressProgress,
          lockSequenceActive: this.level2LockSequenceActive,
          lockShatterProgress: this.getLockShatterProgress(),
          lockBroken: this.level2LockBroken,
          doorUnlocked: this.level2DoorUnlocked
        },
        parkourBlocks: this.getLevel1ParkourBlocks(),
        horizon: this.getHorizonBounds(),
        grounded: this.grounded,
        velocity: {
          y: this.velocity.y
        },
        introTextAlpha: this.introTextAlpha,
        transition: { ...this.transition },
        sceneEmpty: this.sceneEmpty,
        visibleGameplayObjects: this.getVisibleGameplayObjectCount(),
        trailStyle: { ...TRAIL_STYLE },
        uiTexts: {
          remark: this.getTextDebugState(this.uiTexts.remark),
          title: this.getTextDebugState(this.uiTexts.title),
          author: this.getTextDebugState(this.uiTexts.author),
          level: this.getTextDebugState(this.uiTexts.level)
        },
        controlsGuideVisible: this.controlsGuideGraphics.visible,
        trailCount: this.trailSamples.length
      })
    };
  }
}

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  backgroundColor: '#000000',
  render: {
    antialias: false,
    transparent: false,
    clearBeforeRender: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: window.innerWidth,
    height: window.innerHeight
  },
  scene: [BlackScene]
});

window.__POINTSHIFT_GAME__ = game;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
    delete window.__POINTSHIFT_DEBUG__;
    delete window.__POINTSHIFT_GAME__;
  });
}
