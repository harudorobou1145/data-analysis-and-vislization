from typing import List, Tuple


def find_closest_elements(numbers: List[float]) -> Tuple[float, float]:
    """ From a supplied list of numbers (of length at least two) select and return two that are the closest to each
    other and return them in order (smaller number, larger number).
    >>> find_closest_elements([1.0, 2.0, 3.0, 4.0, 5.0, 2.2])
    (2.0, 2.2)
    >>> find_closest_elements([1.0, 2.0, 3.0, 4.0, 5.0, 2.0])
    (2.0, 2.0)
    """
    ordered = sorted(numbers)
    closest = (ordered[0], ordered[1])
    smallest_gap = closest[1] - closest[0]

    for smaller, larger in zip(ordered[1:], ordered[2:]):
        gap = larger - smaller
        if gap < smallest_gap:
            closest = (smaller, larger)
            smallest_gap = gap

    return closest
