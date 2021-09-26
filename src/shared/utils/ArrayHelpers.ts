
interface hasPriority {
  /**
   * higher numbers = higher priority = first in array
   */
  priority:number;
}

/**
 * Adds an item to an array in priority order(highest priority first)
 */
export function addInPriorityOrder(arr:hasPriority[], item:hasPriority) {
  for(let index in arr) {
    let existingItem = arr[index];
    //if this item's priority is less then/equal to ours, insert ourseleves here
    //we want low priority at the end of the array
    if(existingItem.priority < item.priority) {
        arr.splice(Number(index), 0, item);
      return;//we're done!
    }
  }
  //a new low :(
  arr.push(item);
  return;
}
