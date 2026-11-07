from typing import List


def rescale_to_unit(numbers: List[float]) -> List[float]:
    """Given a list of numbers, linearly scale its minimum to 0 and maximum to 1.

    >>> rescale_to_unit([1.0, 2.0, 3.0, 4.0, 5.0])
    [0.0, 0.25, 0.5, 0.75, 1.0]
    """
    minimum = min(numbers)
    maximum = max(numbers)
    span = maximum - minimum

    # A constant list has no nonzero range to scale. Returning zeros gives a
    # well-defined result and avoids division by zero.
    if span == 0:
        return [0.0 for _ in numbers]

    return [(number - minimum) / span for number in numbers]
