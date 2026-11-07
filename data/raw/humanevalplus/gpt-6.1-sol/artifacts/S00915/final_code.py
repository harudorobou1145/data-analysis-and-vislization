from io import StringIO
from operator import index


def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    stop = index(n) + 1
    output = StringIO()
    for start in range(0, stop, 4096):
        if start:
            output.write(" ")
        output.write(" ".join(map(str, range(start, min(start + 4096, stop)))))
    return output.getvalue()
