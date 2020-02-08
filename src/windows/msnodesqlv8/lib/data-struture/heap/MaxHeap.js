const heap = require('./Heap')

class MaxHeap extends heap.Heap {
  /**
   * Checks if pair of heap elements is in correct order.
   * For MinHeap the first element must be always smaller or equal.
   * For MaxHeap the first element must be always bigger or equal.
   *
   * @param {*} firstElement
   * @param {*} secondElement
   * @return {boolean}
   */
  pairIsInCorrectOrder (firstElement, secondElement) {
    return this.compare.greaterThanOrEqual(firstElement, secondElement)
  }
}

exports.MaxHeap = MaxHeap
