def triples_sum_to_zero(l: list):
    """
    triples_sum_to_zero takes a list of integers as an input.
    it returns True if there are three distinct elements in the list that
    sum to zero, and False otherwise.

    >>> triples_sum_to_zero([1, 3, 5, 0])
    False
    >>> triples_sum_to_zero([1, 3, -2, 1])
    True
    >>> triples_sum_to_zero([1, 2, 3, 7])
    False
    >>> triples_sum_to_zero([2, 4, -5, 3, 9, 7])
    True
    >>> triples_sum_to_zero([1])
    False
    """
    values = sorted(l)
    for i in range(len(values) - 2):
        left, right = i + 1, len(values) - 1
        while left < right:
            total = values[i] + values[left] + values[right]
            if total == 0:
                return True
            if total < 0:
                left += 1
            else:
                right -= 1
    return False
