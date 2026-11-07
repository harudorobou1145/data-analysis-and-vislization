import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def find_zero(xs: list):
    """ xs are coefficients of a polynomial.
    find_zero find x such that poly(x) = 0.
    find_zero returns only only zero point, even if there are many.
    Moreover, find_zero only takes list xs having even number of coefficients
    and largest non zero coefficient as it guarantees
    a solution.
    >>> round(find_zero([1, 2]), 2) # f(x) = 1 + 2x
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2) # (x - 1) * (x - 2) * (x - 3) = -6 + 11x - 6x^2 + x^3
    1.0
    """
    coefficients = list(xs)
    while len(coefficients) > 1 and coefficients[-1] == 0:
        coefficients.pop()
    if not coefficients or all(c == 0 for c in coefficients):
        return 0.0
    if coefficients[0] == 0:
        return 0.0

    def evaluate(cs, x):
        value = 0.0
        for coefficient in reversed(cs):
            value = value * x + coefficient
        if math.isfinite(value):
            return value
        from decimal import Decimal, localcontext
        with localcontext() as context:
            context.prec = 80
            point = Decimal.from_float(float(x))
            result = Decimal(0)
            for coefficient in reversed(cs):
                result = result * point + Decimal(coefficient)
            return result

    def bisect(cs, left, right, f_left):
        while True:
            middle = left / 2 + right / 2
            if middle == left or middle == right:
                return min((left, right), key=lambda x: abs(evaluate(cs, x)))
            value = evaluate(cs, middle)
            if value == 0:
                return middle
            if (value < 0) == (f_left < 0):
                left, f_left = middle, value
            else:
                right = middle

    # Try a direct bracket first. It avoids division by a tiny leading
    # coefficient and needs only linear work per evaluation.
    def public_value(x):
        try:
            value = poly(xs, x)
            if math.isfinite(value):
                return value
        except (OverflowError, ValueError):
            pass
        return evaluate(coefficients, x)

    radius = 1.0
    for _ in range(1024):
        left, right = -radius, radius
        f_left, f_right = public_value(left), public_value(right)
        if f_left == 0:
            return left
        if f_right == 0:
            return right
        if (f_left < 0) != (f_right < 0):
            for _ in range(2200):
                middle = left / 2 + right / 2
                if middle == left or middle == right:
                    best = min((left, right), key=lambda x: abs(public_value(x)))
                    if abs(public_value(best)) < 1e-10:
                        return best
                    break
                value = public_value(middle)
                if abs(value) < 1e-12:
                    return middle
                if (value < 0) == (f_left < 0):
                    left, f_left = middle, value
                else:
                    right, f_right = middle, value
            break
        if radius >= 8.98846567431158e307:
            break
        radius *= 2

    def roots(cs):
        if len(cs) == 2:
            return [-cs[0] / cs[1]]
        if len(cs) < 2:
            return []
        # Every real root lies within the Cauchy bound. Between successive
        # derivative roots the polynomial is monotonic.
        bound = 1.0 + max(abs(c / cs[-1]) for c in cs[:-1])
        critical = roots([i * cs[i] for i in range(1, len(cs))])
        points = [-bound] + sorted(x for x in critical if -bound < x < bound) + [bound]
        result = []
        left = points[0]
        f_left = evaluate(cs, left)
        for right in points[1:]:
            f_right = evaluate(cs, right)
            if f_left == 0:
                result.append(left)
            if f_right == 0:
                result.append(right)
            if f_left != 0 and f_right != 0 and (f_left < 0) != (f_right < 0):
                result.append(bisect(cs, left, right, f_left))
            left, f_left = right, f_right
        return result

    candidates = roots(coefficients)
    # Select using the public evaluator, including neighboring floats because
    # powers and Horner evaluation can round differently near a zero.
    def residual(x):
        try:
            value = abs(poly(xs, x))
            return value if math.isfinite(value) else math.inf
        except (OverflowError, ValueError):
            return math.inf

    polished = []
    for root in candidates:
        polished.append(root)
        lower = upper = root
        for _ in range(16):
            lower = math.nextafter(lower, -math.inf)
            upper = math.nextafter(upper, math.inf)
            polished.extend((lower, upper))
    return min(polished, key=lambda x: (residual(x), abs(x)))
