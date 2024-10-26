import { MoveIntent, MovementRequest } from "./types";
import WorldPosition from "shared/utils/map/WorldPosition";

let moveRequests: MovementRequest[] = [];
let moveIntents: MoveIntent[] = [];

// Store position histories on heap
const creepPositionHistories = new Map<string, WorldPosition[]>();
const creepPathIndices = new Map<string, number>();

export function addMoveRequest(request: MovementRequest) {
    moveRequests.push(request);
}

export function getMoveRequests(): MovementRequest[] {
    return moveRequests;
}

export function clearMoveRequests() {
    moveRequests = [];
}

export function addMoveIntent(intent: MoveIntent) {
    moveIntents.push(intent);
}

export function getMoveIntents(): MoveIntent[] {
    return moveIntents;
}

export function clearMoveIntents() {
    moveIntents = [];
}

export function getCreepPositionHistory(creepId: string): WorldPosition[] {
    return creepPositionHistories.get(creepId) || [];
}

export function updateCreepPositionHistory(creepId: string, pos: WorldPosition) {
    let history = creepPositionHistories.get(creepId) || [];
    history.push(pos);
    if (history.length > 5) { // Keep last 5 positions
        history.shift();
    }
    creepPositionHistories.set(creepId, history);
}

export function getCreepPathIndex(creepId: string): number {
    return creepPathIndices.get(creepId) || 0;
}

export function setCreepPathIndex(creepId: string, index: number) {
    creepPathIndices.set(creepId, index);
}

export function clearCreepData(creepId: string) {
    creepPositionHistories.delete(creepId);
    creepPathIndices.delete(creepId);
}

// Clear old data periodically
export function clearOldData() {
    for (const creepId of creepPositionHistories.keys()) {
        if (!Game.creeps[creepId]) {
            clearCreepData(creepId);
        }
    }
}
