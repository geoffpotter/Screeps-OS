export enum RoomMode {
    // rooms the bot is using
    OWNED,
    REMOTE_UNOWNED,
    REMOTE_RESERVED,
    REMOTE_OWNED,
    REMOTE_SK,
    REMOTE_CENTER,
    REMOTE_HIGHWAY,

    //friendly rooms
    FRIENDLY_RESERVED,
    FRIENDLY_OWNED,
    FRIENDLY_ACTIVITY,

    //neutral rooms
    NEUTRAL_RESERVED,
    NEUTRAL_OWNED,
    NEUTRAL_ACTIVITY,

    //enemy rooms
    ENEMY_RESERVED,
    ENEMY_OWNED,
    ENEMY_ACTIVITY,

    // rooms no one is using
    UNUSED,
}
