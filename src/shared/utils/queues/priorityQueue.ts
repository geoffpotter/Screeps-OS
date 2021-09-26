
const top = 0;
const parent = (i: number) => ((i + 1) >>> 1) - 1;
const left = (i: number) => (i << 1) + 1;
const right = (i: number) => (i + 1) << 1;

export class PriorityQueue<T> {
_heap: T[];
_comparator: (a: T, b: T) => boolean;
constructor(comparator = (a: T, b: T) => a > b) {
  this._heap = [];
  this._comparator = comparator;
}
size() {
  return this._heap.length;
}
isEmpty() {
  return this.size() == 0;
}
peek() {
  return this._heap[top];
}
push(...values: any[]) {
  values.forEach(value => {
    this._heap.push(value);
    this._siftUp();
  });
  return this.size();
}
pop() {
  const poppedValue = this.peek();
  const bottom = this.size() - 1;
  if (bottom > top) {
    this._swap(top, bottom);
  }
  this._heap.pop();
  this._siftDown();
  return poppedValue;
}
replace(value: T) {
  const replacedValue = this.peek();
  this._heap[top] = value;
  this._siftDown();
  return replacedValue;
}

replaceByValue(newValue: T, cmp = (a: T,b: T) => a == b) {
    for(let i in this._heap) {
        let item = this._heap[i];
        if (cmp(item, newValue)) {
            //found item, now how to remove it?
            //I assume pop it in place then shift up then down
            this._heap[i] = newValue;
            this._siftDown();
            this._siftUp();
            return true;
        }
    }
    return false;
}
_greater(i: number, j: number) {
  return this._comparator(this._heap[i], this._heap[j]);
}
_swap(i: number, j: number) {
  [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
}
_siftUp() {
  let node = this.size() - 1;
  while (node > top && this._greater(node, parent(node))) {
    this._swap(node, parent(node));
    node = parent(node);
  }
}
_siftDown() {
  let node = top;
  while (
    (left(node) < this.size() && this._greater(left(node), node)) ||
    (right(node) < this.size() && this._greater(right(node), node))
  ) {
    let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
    this._swap(node, maxChild);
    node = maxChild;
  }
}
}
