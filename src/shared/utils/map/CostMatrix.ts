import Logger from 'shared/utils/logger';
import IndexingCollection from 'shared/utils/queues/indexingCollection';

const logger = new Logger('util.cm');

class NodeNetworkCostMatrix extends PathFinder.CostMatrix {
    private roomName: string;
    private type: string;

    constructor(roomName: string, type: string = 'default') {
        super();
        this.roomName = roomName;
        this.type = type;
    }

    get id(): string {
        return `${this.roomName}-${this.type}`;
    }
}

const cms = new IndexingCollection<NodeNetworkCostMatrix>('id', ['roomName', 'type'], [1000, 10000]);

interface CostMatrixUtils {
    getCM(roomName: string, type?: string): NodeNetworkCostMatrix;
    clearPathFromCM(cm: NodeNetworkCostMatrix, path: RoomPosition[]): void;
    setInRange(matrix: NodeNetworkCostMatrix, x_in: number, y_in: number, range: number, cost: number): void;
}

const costMatrixUtils: CostMatrixUtils = {
    getCM(roomName: string, type: string = 'default'): NodeNetworkCostMatrix {
        const id = `${roomName}-${type}`;
        let cm = cms.getById(id);
        if (!cm) {
            cm = new NodeNetworkCostMatrix(roomName, type);
            cms.add(cm);
        }
        return cm;
    },

    clearPathFromCM(cm: NodeNetworkCostMatrix, path: RoomPosition[]): void {
        for (const pos of path) {
            cm.set(pos.x, pos.y, 0);
        }
    },

    setInRange(matrix: NodeNetworkCostMatrix, x_in: number, y_in: number, range: number, cost: number): void {
        const xStart = x_in - range;
        const yStart = y_in - range;
        const xEnd = x_in + range;
        const yEnd = y_in + range;

        for (let x = xStart; x < xEnd; x++) {
            for (let y = yStart; y < yEnd; y++) {
                matrix.set(x, y, cost);
            }
        }
    },
};

export default costMatrixUtils;
