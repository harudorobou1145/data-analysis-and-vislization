
def string_sequence(n: int) -> str:
    """Return a string containing space-delimited numbers from 0 through n.

    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    return " ".join(str(number) for number in range(n + 1))
