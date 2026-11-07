from typing import List, Tuple


def rolling_max(numbers: List[int]) -> List[int]:
    """From a given list of integers, return the maximum seen at each position.

    >>> rolling_max([1, 2, 3, 2, 3, 4, 2])
    [1, 2, 3, 3, 3, 4, 4]
    >>> rolling_max([])
    []
    """
    result: List[int] = []
    current_max: int | None = None
    for number in numbers:
        if current_max is None or number > current_max:
            current_max = number
        result.append(current_max)
    return result
