from typing import List


def parse_nested_parens(paren_string: str) -> List[int]:
    """ Input to this function is a string represented multiple groups for nested parentheses separated by spaces.
    For each of the group, output the deepest level of nesting of parentheses.
    E.g. (()()) has maximum two levels of nesting while ((())) has three.

    >>> parse_nested_parens('(()()) ((())) () ((())()())')
    [2, 3, 1, 3]
    """
    depths = []
    for group in paren_string.split():
        level = 0
        deepest = 0
        for char in group:
            if char == '(':
                level += 1
                deepest = max(deepest, level)
            elif char == ')':
                level -= 1
        depths.append(deepest)
    return depths
