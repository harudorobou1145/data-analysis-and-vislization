from typing import List


def intersperse(numbers: List[int], delimeter: int) -> List[int]:
    """Insert `delimeter` between every two consecutive elements of `numbers`.

    >>> intersperse([], 4)
    []
    >>> intersperse([1, 2, 3], 4)
    [1, 4, 2, 4, 3]
    """
    if not numbers:
        return []

    result = [numbers[0]]
    for number in numbers[1:]:
        result.append(delimeter)
        result.append(number)
    return result
