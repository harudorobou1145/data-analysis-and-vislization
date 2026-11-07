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

    closest_pair = (ordered[0], ordered[1])
    closest_distance = ordered[1] - ordered[0]

    for smaller, larger in zip(ordered, ordered[1:]):
        distance = larger - smaller
        if distance < closest_distance:
            closest_distance = distance
            closest_pair = (smaller, larger)

    return closest_pair
