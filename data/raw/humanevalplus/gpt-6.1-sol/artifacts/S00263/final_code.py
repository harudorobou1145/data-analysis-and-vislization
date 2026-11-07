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
        depth = 0
        maximum_depth = 0
        for paren in group:
            if paren == '(':
                depth += 1
                maximum_depth = max(maximum_depth, depth)
            else:
                depth -= 1
        depths.append(maximum_depth)
    return depths
