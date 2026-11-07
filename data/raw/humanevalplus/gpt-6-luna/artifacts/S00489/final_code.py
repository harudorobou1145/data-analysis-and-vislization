import math


def right_angle_triangle(a, b, c):
    '''
    Given the lengths of the three sides of a triangle. Return True if the three
    sides form a right-angled triangle, False otherwise.
    A right-angled triangle is a triangle in which one angle is right angle or
    90 degree.
    Example:
    right_angle_triangle(3, 4, 5) == True
    right_angle_triangle(1, 2, 3) == False
    '''
    sides = sorted((a, b, c))
    x, y, hypotenuse = sides

    # Triangle side lengths must be positive, and the triangle inequality
    # must be strict (a degenerate triangle is not a right triangle).
    if x <= 0 or x + y <= hypotenuse:
        return False

    lhs = x * x + y * y
    rhs = hypotenuse * hypotenuse
    if isinstance(lhs, float) or isinstance(rhs, float):
        return math.isclose(lhs, rhs, rel_tol=1e-9, abs_tol=1e-12)
    return lhs == rhs
