const heap = require('./Heap')

class MinHeap extends heap.Heap {
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
    return this.compare.lessThanOrEqual(firstElement, secondElement)
  }
}

exports.MinHeap = MinHeap
